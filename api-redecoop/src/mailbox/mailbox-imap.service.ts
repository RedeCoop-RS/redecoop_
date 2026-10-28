import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow, ImapFlowOptions } from 'imapflow';
import { Readable } from 'stream';
import { tlsRejectUnauthorized } from './mailbox.constants';
import { MailboxCredentials, MailboxQuota, RemoteEnvelope, RemoteFolder } from './mailbox.types';
import { structureHasAttachment } from './imap/folder-classifier';
import { MailAddress } from './imap/addresses';
import { decodePreviewPart, headerFlags, previewPart } from './imap/headers';
import { snippetFromText } from './imap/thread';

const HEADER_FIELDS = [
  'x-priority',
  'importance',
  'priority',
  'list-unsubscribe',
  'disposition-notification-to',
];

const ENVELOPE_QUERY = {
  envelope: true,
  flags: true,
  bodyStructure: true,
  size: true,
  uid: true,
  internalDate: true,
  headers: HEADER_FIELDS,
};

export const MAX_SOURCE_BYTES = 60 * 1024 * 1024;

export interface PreviewRequest {
  uid: number;
  part: string;
  encoding?: string;
  charset?: string;
  html: boolean;
}

function flagValues(flags?: Set<string> | string[]): string[] {
  if (!flags) return [];
  return [...flags].map((flag) => String(flag));
}

function hasFlag(flags: string[], name: string): boolean {
  const target = name.toLowerCase();
  return flags.some((flag) => flag.toLowerCase() === target);
}

function mapAddresses(list?: Array<{ name?: string; address?: string }>): MailAddress[] {
  return (list || [])
    .filter((item) => item.address)
    .map((item) => ({
      name: item.name || undefined,
      address: item.address,
    }));
}

async function streamToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      stream.destroy();
      throw new Error('MESSAGE_TOO_LARGE');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class MailboxImapService {
  private readonly logger = new Logger(MailboxImapService.name);

  createClient(creds: MailboxCredentials, idle = false): ImapFlow {
    const options: ImapFlowOptions = {
      host: creds.imapHost,
      port: creds.imapPort,
      secure: creds.imapSecure,
      auth: { user: creds.username, pass: creds.password },
      logger: false,
      tls: { rejectUnauthorized: tlsRejectUnauthorized() },
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: idle ? 15 * 60 * 1000 : 45000,
      clientInfo: { name: 'RedeCoop Painel', vendor: 'RedeCoop' },
    };
    return new ImapFlow(options);
  }

  async withClient<T>(creds: MailboxCredentials, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
    const client = this.createClient(creds);
    client.on('error', (error) => {
      this.logger.warn(`IMAP: ${error.message}`);
    });
    try {
      await client.connect();
      return await fn(client);
    } finally {
      try {
        if (client.usable) await client.logout();
        else client.close();
      } catch {
        client.close();
      }
    }
  }

  async test(creds: MailboxCredentials): Promise<void> {
    await this.withClient(creds, async (client) => {
      await client.list();
    });
  }

  async listFolders(creds: MailboxCredentials): Promise<RemoteFolder[]> {
    return this.withClient(creds, async (client) => this.readFolders(client));
  }

  private async readFolders(client: ImapFlow): Promise<RemoteFolder[]> {
    let listed;
    try {
      listed = await client.list({
        statusQuery: { messages: true, unseen: true, uidValidity: true },
      });
    } catch {
      listed = await client.list();
    }

    return listed.map((box) => {
      const flags = flagValues(box.flags);
      return {
        path: box.path,
        name: box.name || box.path,
        delimiter: box.delimiter || '/',
        specialUse: box.specialUse,
        flags,
        selectable: !flags.some((flag) => flag.toLowerCase() === '\\noselect'),
        messages: box.status?.messages,
        unseen: box.status?.unseen,
        uidValidity: box.status?.uidValidity != null ? String(box.status.uidValidity) : undefined,
      };
    });
  }

  async fetchLatest(
    creds: MailboxCredentials,
    path: string,
    limit: number,
  ): Promise<{ uidValidity: string; exists: number; messages: RemoteEnvelope[] }> {
    return this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        const box = client.mailbox;
        if (!box) return { uidValidity: '', exists: 0, messages: [] };
        const exists = box.exists || 0;
        if (!exists) return { uidValidity: String(box.uidValidity), exists: 0, messages: [] };
        const start = Math.max(1, exists - limit + 1);
        const messages: RemoteEnvelope[] = [];
        for await (const msg of client.fetch(`${start}:*`, ENVELOPE_QUERY)) {
          messages.push(this.toEnvelope(msg));
        }
        return { uidValidity: String(box.uidValidity), exists, messages };
      } finally {
        lock.release();
      }
    });
  }

  async search(
    creds: MailboxCredentials,
    path: string,
    term: string,
  ): Promise<{ uidValidity: string; messages: RemoteEnvelope[] }> {
    return this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        const box = client.mailbox;
        const uidValidity = box ? String(box.uidValidity) : '';
        const found = await client.search(
          { or: [{ subject: term }, { from: term }, { to: term }, { body: term }] },
          { uid: true },
        );
        const uids = (found || []).slice(-100);
        if (!uids.length) return { uidValidity, messages: [] };
        const messages: RemoteEnvelope[] = [];
        for await (const msg of client.fetch(uids, ENVELOPE_QUERY, { uid: true })) {
          messages.push(this.toEnvelope(msg));
        }
        return { uidValidity, messages };
      } finally {
        lock.release();
      }
    });
  }

  async fetchSource(creds: MailboxCredentials, path: string, uid: number): Promise<Buffer> {
    return this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        const downloaded = await client.download(String(uid), undefined, { uid: true });
        if (!downloaded) throw new Error('MESSAGE_NOT_FOUND');
        return await streamToBuffer(downloaded.content, MAX_SOURCE_BYTES);
      } finally {
        lock.release();
      }
    });
  }

  async updateFlags(
    creds: MailboxCredentials,
    path: string,
    uids: number[],
    change: { add?: string[]; remove?: string[] },
  ): Promise<void> {
    await this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        if (change.add?.length) await client.messageFlagsAdd(uids, change.add, { uid: true });
        if (change.remove?.length) {
          await client.messageFlagsRemove(uids, change.remove, { uid: true });
        }
      } finally {
        lock.release();
      }
    });
  }

  async move(
    creds: MailboxCredentials,
    path: string,
    uids: number[],
    destination: string,
  ): Promise<Map<number, number> | null> {
    return this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        const result = await client.messageMove(uids, destination, { uid: true });
        return result && result.uidMap ? result.uidMap : null;
      } finally {
        lock.release();
      }
    });
  }

  async remove(creds: MailboxCredentials, path: string, uids: number[]): Promise<void> {
    await this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        await client.messageDelete(uids, { uid: true });
      } finally {
        lock.release();
      }
    });
  }

  async append(
    creds: MailboxCredentials,
    path: string,
    raw: Buffer,
    flags: string[] = ['\\Seen'],
  ): Promise<void> {
    await this.withClient(creds, async (client) => {
      const result = await client.append(path, raw, flags);
      if (!result) throw new Error('APPEND_FAILED');
    });
  }

  async unseen(creds: MailboxCredentials, path: string): Promise<number | null> {
    return this.withClient(creds, async (client) => {
      const status = await client.status(path, { unseen: true, messages: true });
      return status.unseen ?? null;
    });
  }

  /** Busca só o começo da parte de texto para montar a prévia da lista. */
  async fetchPreviews(
    creds: MailboxCredentials,
    path: string,
    requests: PreviewRequest[],
  ): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    if (!requests.length) return result;
    const groups = new Map<string, PreviewRequest[]>();
    for (const request of requests) {
      const list = groups.get(request.part) ?? [];
      list.push(request);
      groups.set(request.part, list);
    }
    await this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        for (const [part, items] of groups) {
          const byUid = new Map(items.map((item) => [item.uid, item]));
          for await (const msg of client.fetch(
            items.map((item) => item.uid),
            { uid: true, bodyParts: [{ key: part, start: 0, maxLength: 2048 } as never] },
            { uid: true },
          )) {
            const request = byUid.get(msg.uid);
            const chunk = msg.bodyParts?.get(part);
            if (!request || !chunk) continue;
            const text = decodePreviewPart(chunk, request.encoding, request.charset, request.html);
            const snippet = snippetFromText(text);
            if (snippet) result.set(msg.uid, snippet);
          }
        }
      } finally {
        lock.release();
      }
    });
    return result;
  }

  async markAllSeen(creds: MailboxCredentials, path: string): Promise<void> {
    await this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        if (client.mailbox && client.mailbox.exists > 0) {
          await client.messageFlagsAdd('1:*', ['\\Seen']);
        }
      } finally {
        lock.release();
      }
    });
  }

  async deleteAll(creds: MailboxCredentials, path: string): Promise<number> {
    return this.withClient(creds, async (client) => {
      const lock = await client.getMailboxLock(path);
      try {
        const exists = client.mailbox ? client.mailbox.exists : 0;
        if (exists > 0) await client.messageDelete('1:*');
        return exists;
      } finally {
        lock.release();
      }
    });
  }

  /** O imapflow acrescenta o prefixo do namespace (ex.: "INBOX." na Hostinger); devolve o caminho real. */
  async createFolder(
    creds: MailboxCredentials,
    path: string,
  ): Promise<{ path: string; created: boolean }> {
    return this.withClient(creds, async (client) => {
      const result = await client.mailboxCreate(path);
      const realPath = result?.path || path;
      if (result?.created !== false) {
        await client.mailboxSubscribe(realPath).catch(() => undefined);
      }
      return { path: realPath, created: result?.created !== false };
    });
  }

  async renameFolder(creds: MailboxCredentials, path: string, nextPath: string): Promise<void> {
    await this.withClient(creds, async (client) => {
      await client.mailboxRename(path, nextPath);
      await client.mailboxSubscribe(nextPath).catch(() => undefined);
    });
  }

  async deleteFolder(creds: MailboxCredentials, path: string): Promise<void> {
    await this.withClient(creds, async (client) => {
      await client.mailboxDelete(path);
    });
  }

  async quota(creds: MailboxCredentials): Promise<MailboxQuota | null> {
    return this.withClient(creds, async (client) => {
      if (!client.capabilities.has('QUOTA')) return null;
      const quota = await client.getQuota('INBOX').catch(() => false as const);
      if (!quota || !quota.storage || !quota.storage.limit) return null;
      // A tipagem do imapflow diz `used`, mas em tempo de execução o campo vem como `usage`.
      const storage = quota.storage as { used?: number; usage?: number; limit: number };
      return { usage: storage.usage ?? storage.used ?? 0, limit: storage.limit };
    });
  }

  async ensureFolder(creds: MailboxCredentials, path: string): Promise<void> {
    await this.withClient(creds, async (client) => {
      const boxes = await client.list();
      if (boxes.some((box) => box.path === path)) return;
      await client.mailboxCreate(path);
    });
  }

  private toEnvelope(msg: {
    uid: number;
    envelope?: {
      messageId?: string;
      inReplyTo?: string;
      subject?: string;
      from?: Array<{ name?: string; address?: string }>;
      to?: Array<{ name?: string; address?: string }>;
      cc?: Array<{ name?: string; address?: string }>;
      replyTo?: Array<{ name?: string; address?: string }>;
      date?: Date;
    };
    flags?: Set<string>;
    bodyStructure?: { disposition?: string; type: string; childNodes?: unknown[] };
    size?: number;
    internalDate?: Date | string;
    headers?: Buffer;
  }): RemoteEnvelope {
    const flags = flagValues(msg.flags);
    const extra = headerFlags(msg.headers);
    const preview = previewPart(msg.bodyStructure as never);
    const from = msg.envelope?.from?.[0];
    const date = msg.envelope?.date
      ? new Date(msg.envelope.date)
      : msg.internalDate
        ? new Date(msg.internalDate)
        : undefined;
    return {
      uid: msg.uid,
      messageId: msg.envelope?.messageId,
      inReplyTo: msg.envelope?.inReplyTo,
      subject: msg.envelope?.subject || '',
      fromName: from?.name || undefined,
      fromAddress: from?.address || undefined,
      to: mapAddresses(msg.envelope?.to),
      cc: mapAddresses(msg.envelope?.cc),
      replyTo: mapAddresses(msg.envelope?.replyTo),
      date: date && !Number.isNaN(date.getTime()) ? date : undefined,
      seen: hasFlag(flags, '\\Seen'),
      flagged: hasFlag(flags, '\\Flagged'),
      answered: hasFlag(flags, '\\Answered'),
      hasAttachments: structureHasAttachment(msg.bodyStructure as never),
      size: msg.size || 0,
      priority: extra.priority,
      listUnsubscribe: extra.listUnsubscribe,
      receiptTo: extra.receiptTo,
      headersCached: Boolean(msg.headers),
      previewPart: preview || undefined,
    };
  }
}
