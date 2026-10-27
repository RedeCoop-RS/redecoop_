import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { randomUUID } from 'crypto';
import { AddressObject, simpleParser } from 'mailparser';
import { In, Repository } from 'typeorm';
import { MailboxAccount } from './entities/mailbox-account.entity';
import { MailboxFolder } from './entities/mailbox-folder.entity';
import { AttachmentMeta, MailboxMessage } from './entities/mailbox-message.entity';
import { MailboxDraft } from './entities/mailbox-draft.entity';
import { MailboxDraftAttachment } from './entities/mailbox-draft-attachment.entity';
import { MailboxAuditLog } from './entities/mailbox-audit-log.entity';
import { MailboxCryptoError, MailboxCryptoService } from './crypto/mailbox-crypto.service';
import { MailboxImapService } from './mailbox-imap.service';
import { MailboxSmtpService } from './mailbox-smtp.service';
import { MailboxRateLimitService } from './security/mailbox-rate-limit.service';
import { htmlToText, sanitizeMailboxHtml, withSignature } from './security/mailbox-html';
import { classifyFolder, specialUseOrder } from './imap/folder-classifier';
import { snippetFromText, threadKey } from './imap/thread';
import { formatAddress, MailAddress, parseAddressList } from './imap/addresses';
import { toAccountView } from './presenters/account.presenter';
import { notifyMailboxAccountChanged } from './mailbox.hooks';
import {
  assertAllowedAttachment,
  defaultSyncIntervalSeconds,
  MAILBOX_LIMITS,
  mailboxUploadDir,
  maxDraftBytes,
  safeFilename,
  syncMessageLimit,
} from './mailbox.constants';
import { MailboxCredentials, RemoteEnvelope, RemoteFolder } from './mailbox.types';
import {
  FlaggedDto,
  ListMessagesDto,
  MoveMessagesDto,
  ReadMessageDto,
  SaveDraftDto,
  SeenDto,
  SendMailDto,
  TestMailboxDto,
  UpsertMailboxAccountDto,
} from './dto/mailbox.dto';

@Injectable()
export class MailboxService {
  private readonly logger = new Logger(MailboxService.name);
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    @InjectRepository(MailboxAccount) private readonly accounts: Repository<MailboxAccount>,
    @InjectRepository(MailboxFolder) private readonly folders: Repository<MailboxFolder>,
    @InjectRepository(MailboxMessage) private readonly messages: Repository<MailboxMessage>,
    @InjectRepository(MailboxDraft) private readonly drafts: Repository<MailboxDraft>,
    @InjectRepository(MailboxDraftAttachment)
    private readonly draftFiles: Repository<MailboxDraftAttachment>,
    @InjectRepository(MailboxAuditLog) private readonly audits: Repository<MailboxAuditLog>,
    private readonly crypto: MailboxCryptoService,
    private readonly imap: MailboxImapService,
    private readonly smtp: MailboxSmtpService,
    private readonly rate: MailboxRateLimitService,
  ) {}

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async getAccountView() {
    const account = await this.findAccount();
    const unread = account ? await this.inboxUnread(account.id) : 0;
    return toAccountView(account, unread);
  }

  async saveAccount(userId: number, dto: UpsertMailboxAccountDto) {
    const existing = await this.findAccount();
    const password = dto.password?.trim();
    let passwordCipher = existing?.passwordCipher;
    if (password) {
      try {
        passwordCipher = this.crypto.encrypt(password);
      } catch (error) {
        throw this.cryptoError(error);
      }
    }
    if (!passwordCipher) {
      throw new BadRequestException('Informe a senha da caixa de e-mail.');
    }

    const account = existing ?? this.accounts.create();
    account.label = dto.label?.trim() || 'Caixa principal';
    account.email = dto.email.trim();
    account.displayName = dto.displayName?.trim() || null;
    account.imapHost = dto.imapHost.trim();
    account.imapPort = dto.imapPort;
    account.imapSecure = dto.imapSecure;
    account.smtpHost = dto.smtpHost.trim();
    account.smtpPort = dto.smtpPort;
    account.smtpSecure = dto.smtpSecure;
    account.username = dto.username.trim();
    account.passwordCipher = passwordCipher;
    account.signatureHtml = dto.signatureHtml?.trim() || null;
    account.syncIntervalSeconds = dto.syncIntervalSeconds || defaultSyncIntervalSeconds();
    account.createdByUserId = account.createdByUserId || userId;
    const saved = await this.accounts.save(account);
    notifyMailboxAccountChanged();
    return toAccountView(saved, await this.inboxUnread(saved.id));
  }

  async deleteAccount() {
    const account = await this.findAccount();
    if (!account) return { ok: true };
    const drafts = await this.drafts.find({ where: { accountId: account.id } });
    for (const draft of drafts) {
      const files = await this.draftFiles.find({ where: { draftId: draft.id } });
      for (const file of files) await this.removeStoredFile(file.storageName);
    }
    await this.accounts.delete({ id: account.id });
    notifyMailboxAccountChanged();
    return { ok: true };
  }

  async testConnection(userId: number, dto: TestMailboxDto) {
    this.rate.consume(
      `mailbox:test:${userId}`,
      MAILBOX_LIMITS.test.limit,
      MAILBOX_LIMITS.test.windowMs,
    );
    const creds = await this.credentialsFromInput(dto);
    const steps = [
      {
        name: 'IMAP',
        host: creds.imapHost,
        port: creds.imapPort,
        run: () => this.imap.test(creds),
      },
      {
        name: 'SMTP',
        host: creds.smtpHost,
        port: creds.smtpPort,
        run: () => this.smtp.verify(creds),
      },
    ];
    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        const failure = this.fail(error, 'Não foi possível conectar.', creds.password);
        throw new BadRequestException(
          `${step.name} (${step.host}:${step.port}): ${failure.message}`,
        );
      }
    }
    return { ok: true, message: 'IMAP e SMTP conectaram com sucesso.' };
  }

  async listFolders() {
    const account = await this.findAccount();
    if (!account) return { configured: false, folders: [], localDrafts: 0, unread: 0 };
    const folders = await this.folders.find({ where: { accountId: account.id } });
    const localDrafts = await this.drafts.count({ where: { accountId: account.id } });
    return {
      configured: true,
      localDrafts,
      unread: folders
        .filter((folder) => folder.specialUse === 'inbox')
        .reduce((sum, folder) => sum + (folder.unreadCount || 0), 0),
      folders: folders
        .slice()
        .sort(
          (a, b) =>
            specialUseOrder(a.specialUse) - specialUseOrder(b.specialUse) ||
            a.name.localeCompare(b.name, 'pt-BR'),
        )
        .map((folder) => ({
          id: folder.id,
          path: folder.path,
          name: folder.name,
          specialUse: folder.specialUse,
          unreadCount: folder.unreadCount,
          totalCount: folder.totalCount,
          selectable: folder.selectable,
        })),
    };
  }

  async sync(userId: number | null, opts?: { folder?: string; limit?: number }) {
    if (userId) {
      this.rate.consume(
        `mailbox:sync:${userId}`,
        MAILBOX_LIMITS.sync.limit,
        MAILBOX_LIMITS.sync.windowMs,
      );
    }
    return this.enqueue(() => this.syncUnlocked(opts));
  }

  async syncQuiet(force = false) {
    const account = await this.findAccount();
    if (!account) return;
    const intervalMs = Math.max(30, account.syncIntervalSeconds || 60) * 1000;
    if (
      !force &&
      account.lastSyncAt &&
      Date.now() - new Date(account.lastSyncAt).getTime() < intervalMs
    ) {
      return;
    }
    try {
      await this.sync(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Sincronização automática do e-mail falhou: ${message}`);
    }
  }

  async getIdleCredentials(): Promise<MailboxCredentials | null> {
    const account = await this.findAccount();
    if (!account) return null;
    try {
      return this.credsFrom(account, this.crypto.decrypt(account.passwordCipher));
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'Chave de criptografia inválida');
      return null;
    }
  }

  async unread() {
    const account = await this.findAccount();
    if (!account) return { configured: false, unread: 0, lastSyncAt: null };
    void this.syncQuiet(false);
    return {
      configured: true,
      unread: await this.inboxUnread(account.id),
      lastSyncAt: account.lastSyncAt,
    };
  }

  async listMessages(input: ListMessagesDto) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, input.folder);
    const term = input.q?.trim();
    if (term && term.length >= 2) {
      try {
        const found = await this.imap.search(creds, folder.path, term.slice(0, 120));
        await this.upsertEnvelopes(account.id, folder, found.messages);
      } catch (error) {
        this.logger.warn(`Busca IMAP falhou, usando cache local: ${this.describe(error)}`);
      }
    }

    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 30));
    const qb = this.messages
      .createQueryBuilder('m')
      .where('m.folderId = :folderId', { folderId: folder.id });
    if (input.unread) qb.andWhere('m.seen = :seen', { seen: false });
    if (input.starred) qb.andWhere('m.flagged = :flagged', { flagged: true });
    if (input.attachments) qb.andWhere('m.hasAttachments = :has', { has: true });
    if (term) {
      const q = `%${term.replace(/[\\%_]/g, '').slice(0, 200)}%`;
      qb.andWhere(
        '(m.subject LIKE :q OR m.fromAddress LIKE :q OR m.fromName LIKE :q OR m.snippet LIKE :q)',
        { q },
      );
    }
    if (input.sort === 'date_asc') qb.orderBy('m.messageDate', 'ASC');
    else if (input.sort === 'subject') qb.orderBy('m.subject', 'ASC');
    else if (input.sort === 'from') qb.orderBy('m.fromName', 'ASC');
    else qb.orderBy('m.messageDate', 'DESC');
    qb.addOrderBy('m.uid', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.toListItem(row)),
      total,
      page,
      limit,
      folder: {
        path: folder.path,
        name: folder.name,
        specialUse: folder.specialUse,
        unreadCount: folder.unreadCount,
      },
    };
  }

  async readMessage(input: ReadMessageDto) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, input.folder);
    let row = await this.messages.findOne({ where: { folderId: folder.id, uid: input.uid } });
    if (!row) {
      await this.syncFolderMessages(creds, account.id, folder, syncMessageLimit());
      row = await this.messages.findOne({ where: { folderId: folder.id, uid: input.uid } });
    }
    if (!row) throw new NotFoundException('Mensagem não encontrada nesta pasta.');

    if (!row.bodyCached) {
      try {
        const source = await this.imap.fetchSource(creds, folder.path, input.uid);
        const parsed = await simpleParser(source);
        this.applyParsed(row, parsed);
        await this.messages.save(row);
        await this.linkThread(row);
      } catch (error) {
        throw this.fail(error, 'Não foi possível abrir a mensagem.', creds.password);
      }
    }

    if (!input.peek && !row.seen) {
      await this.imap.updateFlags(creds, folder.path, [row.uid], { add: ['\\Seen'] });
      row.seen = true;
      await this.messages.save(row);
      await this.refreshUnseen(creds, folder);
    }

    const sanitized = sanitizeMailboxHtml(row.htmlBody || '', {
      allowRemoteImages: Boolean(input.loadRemoteImages),
    });
    return {
      uid: row.uid,
      folder: folder.path,
      folderName: folder.name,
      specialUse: folder.specialUse,
      subject: row.subject || '(sem assunto)',
      from: { name: row.fromName, address: row.fromAddress },
      to: row.toAddresses || [],
      cc: row.ccAddresses || [],
      replyTo: row.replyToAddresses || [],
      date: row.messageDate,
      seen: row.seen,
      flagged: row.flagged,
      answered: row.answered,
      hasAttachments: row.hasAttachments,
      size: row.size,
      messageId: row.messageId,
      inReplyTo: row.inReplyTo,
      references: row.referencesHeader,
      threadKey: row.threadKey,
      html: row.htmlBody ? sanitized.html : '',
      text: row.textBody || htmlToText(row.htmlBody),
      remoteImageCount: sanitized.remoteImageCount,
      remoteImagesBlocked: !input.loadRemoteImages && sanitized.remoteImageCount > 0,
      attachments: row.attachmentsMeta || [],
      thread: await this.threadSummaries(account.id, row.threadKey),
    };
  }

  async setSeen(dto: SeenDto) {
    return this.changeFlags(
      dto.folder,
      dto.uids,
      dto.seen ? { add: ['\\Seen'] } : { remove: ['\\Seen'] },
      {
        seen: dto.seen,
      },
    );
  }

  async setFlagged(dto: FlaggedDto) {
    return this.changeFlags(
      dto.folder,
      dto.uids,
      dto.flagged ? { add: ['\\Flagged'] } : { remove: ['\\Flagged'] },
      { flagged: dto.flagged },
    );
  }

  async move(dto: MoveMessagesDto) {
    const { account, creds } = await this.requireAccount();
    const source = await this.folderByPath(account.id, dto.folder);
    const target = await this.folderByPath(account.id, dto.targetFolder);
    if (source.id === target.id) return { ok: true, moved: 0 };
    try {
      const uidMap = await this.imap.move(creds, source.path, dto.uids, target.path);
      await this.relocate(source, target, dto.uids, uidMap);
      await this.refreshUnseen(creds, source);
      await this.refreshUnseen(creds, target);
    } catch (error) {
      throw this.fail(error, 'Não foi possível mover as mensagens.', creds.password);
    }
    return { ok: true, moved: dto.uids.length };
  }

  async archive(folder: string, uids: number[]) {
    const { account, creds } = await this.requireAccount();
    const folders = await this.folders.find({ where: { accountId: account.id } });
    const destination = this.archiveDestination(folders);
    if (destination.create) {
      try {
        await this.imap.ensureFolder(creds, destination.path);
        await this.sync(null);
      } catch (error) {
        throw this.fail(error, 'Não foi possível criar a pasta Arquivo.', creds.password);
      }
    }
    return this.move({ folder, uids, targetFolder: destination.path });
  }

  async spam(folder: string, uids: number[]) {
    const { account } = await this.requireAccount();
    const target = (await this.folders.find({ where: { accountId: account.id } })).find(
      (item) => item.specialUse === 'spam',
    );
    if (!target) {
      throw new BadRequestException('Esta conta não tem pasta de spam.');
    }
    return this.move({ folder, uids, targetFolder: target.path });
  }

  async remove(folder: string, uids: number[]) {
    const { account, creds } = await this.requireAccount();
    const source = await this.folderByPath(account.id, folder);
    const trash = await this.folders.findOne({
      where: { accountId: account.id, specialUse: 'trash' },
    });
    if (!trash || source.specialUse === 'trash') {
      try {
        await this.imap.remove(creds, source.path, uids);
        await this.messages.delete({ folderId: source.id, uid: In(uids) });
        await this.refreshUnseen(creds, source);
      } catch (error) {
        throw this.fail(error, 'Não foi possível excluir as mensagens.', creds.password);
      }
      return { ok: true, permanent: true };
    }
    await this.move({ folder, uids, targetFolder: trash.path });
    return { ok: true, permanent: false };
  }

  async restore(uids: number[]) {
    const account = await this.requireAccount();
    const trash = await this.folders.findOne({
      where: { accountId: account.account.id, specialUse: 'trash' },
    });
    const inbox = await this.folders.findOne({
      where: { accountId: account.account.id, specialUse: 'inbox' },
    });
    if (!trash || !inbox)
      throw new BadRequestException('Não encontrei a lixeira ou a caixa de entrada.');
    return this.move({ folder: trash.path, uids, targetFolder: inbox.path });
  }

  async downloadAttachment(folder: string, uid: number, index: number) {
    const { creds } = await this.requireAccount();
    try {
      const source = await this.imap.fetchSource(creds, this.cleanPath(folder), uid);
      const parsed = await simpleParser(source);
      const file = parsed.attachments[index];
      if (!file) throw new NotFoundException('Anexo não encontrado.');
      return {
        filename: safeFilename(file.filename || `anexo-${index + 1}`),
        contentType: file.contentType || 'application/octet-stream',
        content: file.content,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw this.fail(error, 'Não foi possível baixar o anexo.', creds.password);
    }
  }

  async listDrafts() {
    const account = await this.findAccount();
    if (!account) return [];
    const drafts = await this.drafts.find({
      where: { accountId: account.id },
      order: { updatedAt: 'DESC' },
    });
    const result = [];
    for (const draft of drafts) {
      const attachments = await this.draftFiles.find({ where: { draftId: draft.id } });
      result.push(this.toDraft(draft, attachments));
    }
    return result;
  }

  async saveDraft(dto: SaveDraftDto, id?: number) {
    const { account } = await this.requireAccount();
    const draft = id
      ? await this.drafts.findOne({ where: { id, accountId: account.id } })
      : this.drafts.create({ accountId: account.id });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    if (!draft.accountId) draft.accountId = account.id;
    draft.toText = dto.to ?? draft.toText ?? '';
    draft.ccText = dto.cc ?? draft.ccText ?? '';
    draft.bccText = dto.bcc ?? draft.bccText ?? '';
    draft.subject = dto.subject ?? draft.subject ?? '';
    draft.html = dto.html ?? draft.html ?? '';
    draft.mode = dto.mode || draft.mode || 'new';
    draft.sourceFolder = dto.sourceFolder ?? draft.sourceFolder;
    draft.sourceUid = dto.sourceUid ?? draft.sourceUid;
    draft.inReplyTo = dto.inReplyTo ?? draft.inReplyTo;
    draft.referencesHeader = dto.references ?? draft.referencesHeader;
    if (dto.includeSignature !== undefined) draft.includeSignature = dto.includeSignature;
    const saved = await this.drafts.save(draft);
    const attachments = await this.draftFiles.find({ where: { draftId: saved.id } });
    return this.toDraft(saved, attachments);
  }

  async deleteDraft(id: number) {
    const account = await this.requireAccount();
    const draft = await this.drafts.findOne({ where: { id, accountId: account.account.id } });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    const files = await this.draftFiles.find({ where: { draftId: draft.id } });
    for (const file of files) await this.removeStoredFile(file.storageName);
    await this.draftFiles.delete({ draftId: draft.id });
    await this.drafts.delete({ id: draft.id });
    return { ok: true };
  }

  async addAttachment(userId: number, draftId: number, file: Express.Multer.File) {
    this.rate.consume(
      `mailbox:upload:${userId}`,
      MAILBOX_LIMITS.upload.limit,
      MAILBOX_LIMITS.upload.windowMs,
    );
    const { account } = await this.requireAccount();
    const draft = await this.drafts.findOne({ where: { id: draftId, accountId: account.id } });
    if (!draft) {
      if (file?.path) await fs.unlink(file.path).catch(() => undefined);
      throw new NotFoundException('Rascunho não encontrado.');
    }
    try {
      assertAllowedAttachment(file.originalname || file.filename, file.size);
    } catch (error) {
      if (file?.path) await fs.unlink(file.path).catch(() => undefined);
      const code = error instanceof Error ? error.message : '';
      if (code.startsWith('BLOCKED_EXT')) {
        throw new BadRequestException('Esse tipo de arquivo não pode ser anexado.');
      }
      if (code === 'TOO_LARGE')
        throw new BadRequestException('O anexo excede o tamanho máximo permitido.');
      throw new BadRequestException('Arquivo de anexo inválido.');
    }
    const current = await this.draftFiles.find({ where: { draftId } });
    const total = current.reduce((sum, item) => sum + item.size, 0) + file.size;
    if (total > maxDraftBytes()) {
      if (file?.path) await fs.unlink(file.path).catch(() => undefined);
      throw new BadRequestException('A soma dos anexos deste rascunho passou do limite.');
    }
    const saved = await this.draftFiles.save(
      this.draftFiles.create({
        draftId,
        filename: safeFilename(file.originalname || 'anexo'),
        contentType: file.mimetype || 'application/octet-stream',
        size: file.size,
        storageName: basename(file.filename),
      }),
    );
    return {
      id: saved.id,
      filename: saved.filename,
      contentType: saved.contentType,
      size: saved.size,
    };
  }

  async deleteDraftAttachment(draftId: number, attachmentId: number) {
    const { account } = await this.requireAccount();
    const draft = await this.drafts.findOne({ where: { id: draftId, accountId: account.id } });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    const file = await this.draftFiles.findOne({ where: { id: attachmentId, draftId } });
    if (!file) throw new NotFoundException('Anexo não encontrado.');
    await this.removeStoredFile(file.storageName);
    await this.draftFiles.delete({ id: file.id });
    return { ok: true };
  }

  async readDraftAttachment(draftId: number, attachmentId: number) {
    const { account } = await this.requireAccount();
    const draft = await this.drafts.findOne({ where: { id: draftId, accountId: account.id } });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    const file = await this.draftFiles.findOne({ where: { id: attachmentId, draftId } });
    if (!file) throw new NotFoundException('Anexo não encontrado.');
    const content = await fs.readFile(this.storedPath(file.storageName));
    return { filename: file.filename, contentType: file.contentType, content };
  }

  async send(userId: number, dto: SendMailDto) {
    this.rate.consume(
      `mailbox:send:${userId}`,
      MAILBOX_LIMITS.send.limit,
      MAILBOX_LIMITS.send.windowMs,
    );
    const { account, creds } = await this.requireAccount();
    const draft = dto.draftId
      ? await this.drafts.findOne({ where: { id: dto.draftId, accountId: account.id } })
      : null;
    if (dto.draftId && !draft) throw new NotFoundException('Rascunho não encontrado.');

    const to = parseAddressList(dto.to ?? draft?.toText);
    const cc = parseAddressList(dto.cc ?? draft?.ccText);
    const bcc = parseAddressList(dto.bcc ?? draft?.bccText);
    if (!to.length && !cc.length && !bcc.length) {
      throw new BadRequestException('Informe ao menos um destinatário.');
    }
    if (to.length + cc.length + bcc.length > 50) {
      throw new BadRequestException('No máximo 50 destinatários por mensagem.');
    }

    const includeSignature = dto.includeSignature ?? draft?.includeSignature ?? true;
    const html = sanitizeMailboxHtml(
      withSignature(dto.html ?? draft?.html ?? '', account.signatureHtml, includeSignature),
      { allowRemoteImages: true },
    ).html;
    const subject = (dto.subject ?? draft?.subject ?? '').trim() || '(sem assunto)';
    const domain = (account.email.split('@')[1] || 'redecoop.local').replace(/[^a-z0-9.-]/gi, '');
    const messageId = `<${randomUUID()}@${domain}>`;
    const files = draft ? await this.draftFiles.find({ where: { draftId: draft.id } }) : [];
    const attachments = [];
    for (const file of files) {
      attachments.push({
        filename: file.filename,
        contentType: file.contentType,
        content: await fs.readFile(this.storedPath(file.storageName)),
      });
    }

    let sentId = messageId;
    let raw: Buffer;
    try {
      const result = await this.smtp.send(creds, {
        from: formatAddress({ name: account.displayName || undefined, address: account.email }),
        to: to.map(formatAddress),
        cc: cc.map(formatAddress),
        bcc: bcc.map(formatAddress),
        subject,
        html,
        text: htmlToText(html),
        messageId,
        inReplyTo: dto.inReplyTo || draft?.inReplyTo || undefined,
        references: dto.references || draft?.referencesHeader || undefined,
        attachments,
      });
      sentId = result.messageId;
      raw = result.raw;
    } catch (error) {
      throw this.fail(error, 'Não foi possível enviar o e-mail.', creds.password);
    }

    await this.audits.save(
      this.audits.create({
        userId,
        accountId: account.id,
        action: 'SEND',
        recipients: [...to, ...cc, ...bcc].map((item) => item.address).join(', '),
        subject,
        messageId: sentId,
      }),
    );

    let warning: string | undefined;
    const sentFolder = await this.folders.findOne({
      where: { accountId: account.id, specialUse: 'sent' },
    });
    if (sentFolder) {
      try {
        await this.imap.append(creds, sentFolder.path, raw, ['\\Seen']);
      } catch (error) {
        this.logger.warn(
          `E-mail enviado, mas não foi copiado para Enviados: ${this.describe(error)}`,
        );
        warning = 'A mensagem foi enviada, mas não apareceu na pasta Enviados.';
      }
    }

    const sourceFolder = dto.sourceFolder || draft?.sourceFolder;
    const sourceUid = dto.sourceUid || draft?.sourceUid;
    if (sourceFolder && sourceUid && (dto.mode || draft?.mode || '').startsWith('reply')) {
      try {
        await this.imap.updateFlags(creds, sourceFolder, [sourceUid], { add: ['\\Answered'] });
        const folder = await this.folderByPath(account.id, sourceFolder);
        await this.messages.update({ folderId: folder.id, uid: sourceUid }, { answered: true });
      } catch {
        // O envio já aconteceu; a flag de respondido é complementar.
      }
    }

    if (draft) {
      for (const file of files) await this.removeStoredFile(file.storageName);
      await this.draftFiles.delete({ draftId: draft.id });
      await this.drafts.delete({ id: draft.id });
    }

    return { ok: true, messageId: sentId, warning };
  }

  async listAudit(page = 1, limit = 20) {
    const take = Math.min(100, Math.max(1, limit));
    const current = Math.max(1, page);
    const [rows, total] = await this.audits.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (current - 1) * take,
      take,
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        recipients: row.recipients,
        subject: row.subject,
        messageId: row.messageId,
        createdAt: row.createdAt,
      })),
      total,
      page: current,
      limit: take,
    };
  }

  private async syncUnlocked(opts?: { folder?: string; limit?: number }) {
    const { account, creds } = await this.requireAccount();
    try {
      const remote = await this.imap.listFolders(creds);
      const folders = await this.upsertFolders(account.id, remote);
      const target = opts?.folder
        ? folders.find((folder) => folder.path === opts.folder)
        : folders.find((folder) => folder.specialUse === 'inbox') ||
          folders.find((folder) => folder.selectable);
      let messages = 0;
      if (target?.selectable) {
        messages = await this.syncFolderMessages(
          creds,
          account.id,
          target,
          syncMessageLimit(opts?.limit),
        );
      } else if (opts?.folder) {
        throw new NotFoundException('Pasta não encontrada no servidor.');
      }
      account.lastSyncAt = new Date();
      account.lastError = null;
      await this.accounts.save(account);
      return {
        ok: true,
        folders: folders.length,
        syncedFolder: target?.path,
        messages,
        unread: await this.inboxUnread(account.id),
        lastSyncAt: account.lastSyncAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      account.lastError = 'Falha na última sincronização.';
      await this.accounts.save(account);
      throw this.fail(error, 'Não foi possível sincronizar a caixa.', creds.password);
    }
  }

  private async syncFolderMessages(
    creds: MailboxCredentials,
    accountId: number,
    folder: MailboxFolder,
    limit: number,
  ) {
    const fetched = await this.imap.fetchLatest(creds, folder.path, limit);
    if (fetched.uidValidity && folder.uidValidity && fetched.uidValidity !== folder.uidValidity) {
      await this.messages.delete({ folderId: folder.id });
    }
    if (fetched.exists === 0) {
      await this.messages.delete({ folderId: folder.id });
    }
    folder.uidValidity = fetched.uidValidity || folder.uidValidity;
    folder.totalCount = fetched.exists;
    await this.folders.save(folder);
    await this.upsertEnvelopes(accountId, folder, fetched.messages);
    await this.dropMissingInWindow(folder.id, fetched.messages);
    await this.refreshUnseen(creds, folder);
    return fetched.messages.length;
  }

  private async upsertFolders(accountId: number, remote: RemoteFolder[]) {
    const existing = await this.folders.find({ where: { accountId } });
    const byPath = new Map(existing.map((folder) => [folder.path, folder]));
    const seen = new Set<string>();
    const saved: MailboxFolder[] = [];
    for (const item of remote) {
      seen.add(item.path);
      const row = byPath.get(item.path) ?? this.folders.create({ accountId, path: item.path });
      row.name = (item.name || item.path).slice(0, 255);
      row.specialUse = classifyFolder(item);
      if (typeof item.unseen === 'number') row.unreadCount = item.unseen;
      if (typeof item.messages === 'number') row.totalCount = item.messages;
      if (item.uidValidity) row.uidValidity = item.uidValidity;
      row.selectable = item.selectable;
      saved.push(await this.folders.save(row));
    }
    const missing = existing.filter((folder) => !seen.has(folder.path));
    if (missing.length) await this.folders.remove(missing);
    return saved;
  }

  private async upsertEnvelopes(
    accountId: number,
    folder: MailboxFolder,
    envelopes: RemoteEnvelope[],
  ) {
    if (!envelopes.length) return;
    const cached = await this.messages.find({ where: { folderId: folder.id } });
    const byUid = new Map(cached.map((row) => [row.uid, row]));
    const known = await this.messages.find({
      where: { accountId },
      select: ['id', 'messageId', 'threadKey'],
    });
    const threadByMessageId = new Map<string, string>();
    for (const row of known) {
      if (row.messageId) threadByMessageId.set(this.normalizeId(row.messageId), row.threadKey);
    }

    for (const envelope of envelopes) {
      const row =
        byUid.get(envelope.uid) ??
        this.messages.create({ accountId, folderId: folder.id, uid: envelope.uid });
      row.accountId = accountId;
      row.folderId = folder.id;
      row.uid = envelope.uid;
      row.messageId = envelope.messageId || row.messageId;
      row.inReplyTo = envelope.inReplyTo || row.inReplyTo;
      row.subject = (envelope.subject || '').slice(0, 998);
      row.fromName = envelope.fromName || null;
      row.fromAddress = envelope.fromAddress || null;
      row.toAddresses = envelope.to;
      row.ccAddresses = envelope.cc;
      row.replyToAddresses = envelope.replyTo;
      row.messageDate = envelope.date || row.messageDate;
      row.seen = envelope.seen;
      row.flagged = envelope.flagged;
      row.answered = envelope.answered;
      row.hasAttachments = envelope.hasAttachments;
      row.size = envelope.size || 0;
      const parent = envelope.inReplyTo
        ? threadByMessageId.get(this.normalizeId(envelope.inReplyTo))
        : undefined;
      row.threadKey =
        parent ||
        threadKey({
          messageId: row.messageId,
          inReplyTo: row.inReplyTo,
          subject: row.subject,
        });
      if (!row.snippet) row.snippet = null;
      const saved = await this.messages.save(row);
      if (saved.messageId)
        threadByMessageId.set(this.normalizeId(saved.messageId), saved.threadKey);
    }
  }

  private async dropMissingInWindow(folderId: number, envelopes: RemoteEnvelope[]) {
    if (!envelopes.length) return;
    const keep = new Set(envelopes.map((item) => item.uid));
    const min = Math.min(...envelopes.map((item) => item.uid));
    const max = Math.max(...envelopes.map((item) => item.uid));
    const cached = await this.messages.find({ where: { folderId } });
    const stale = cached.filter((row) => row.uid >= min && row.uid <= max && !keep.has(row.uid));
    if (stale.length) await this.messages.delete(stale.map((row) => row.id));
  }

  private applyParsed(row: MailboxMessage, parsed: Awaited<ReturnType<typeof simpleParser>>) {
    const html = typeof parsed.html === 'string' ? parsed.html : parsed.textAsHtml || '';
    row.subject = (parsed.subject || row.subject || '').slice(0, 998);
    row.messageId = parsed.messageId || row.messageId;
    row.inReplyTo = parsed.inReplyTo || row.inReplyTo;
    row.referencesHeader = Array.isArray(parsed.references)
      ? parsed.references.join(' ')
      : parsed.references || row.referencesHeader;
    row.threadKey = threadKey({
      messageId: row.messageId,
      inReplyTo: row.inReplyTo,
      references: parsed.references,
      subject: row.subject,
    });
    const from = parsed.from?.value?.[0];
    if (from?.address) {
      row.fromName = from.name || row.fromName;
      row.fromAddress = from.address;
    }
    row.toAddresses = this.addressValues(parsed.to);
    row.ccAddresses = this.addressValues(parsed.cc);
    row.replyToAddresses = this.addressValues(parsed.replyTo);
    if (parsed.date) row.messageDate = parsed.date;
    row.textBody = parsed.text || htmlToText(html);
    row.htmlBody = html.length <= 2_000_000 ? html : null;
    row.snippet = snippetFromText(row.textBody);
    row.attachmentsMeta = (parsed.attachments || []).map((file, index) => ({
      index,
      filename: safeFilename(file.filename || `anexo-${index + 1}`),
      contentType: file.contentType || 'application/octet-stream',
      size: file.size || file.content?.length || 0,
      contentId: file.cid || file.contentId,
      related: Boolean(file.related),
    })) as AttachmentMeta[];
    row.hasAttachments = row.attachmentsMeta.some((file) => !file.related);
    row.bodyCached = true;
  }

  private async linkThread(row: MailboxMessage) {
    if (!row.messageId) return;
    await this.messages
      .createQueryBuilder()
      .update(MailboxMessage)
      .set({ threadKey: row.threadKey })
      .where('account_id = :accountId', { accountId: row.accountId })
      .andWhere('(in_reply_to = :messageId OR message_id = :messageId)', {
        messageId: row.messageId,
      })
      .execute();
  }

  private async threadSummaries(accountId: number, key: string) {
    const rows = await this.messages.find({
      where: { accountId, threadKey: key },
      order: { messageDate: 'ASC' },
      take: 50,
    });
    const folderIds = [...new Set(rows.map((row) => row.folderId))];
    const folders = folderIds.length
      ? await this.folders.find({ where: { id: In(folderIds) } })
      : [];
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    return rows.map((row) => ({
      uid: row.uid,
      folder: byId.get(row.folderId)?.path,
      folderName: byId.get(row.folderId)?.name,
      subject: row.subject || '(sem assunto)',
      fromName: row.fromName,
      fromAddress: row.fromAddress,
      date: row.messageDate,
      seen: row.seen,
      snippet: row.snippet,
    }));
  }

  private async changeFlags(
    folderPath: string,
    uids: number[],
    change: { add?: string[]; remove?: string[] },
    patch: Partial<Pick<MailboxMessage, 'seen' | 'flagged'>>,
  ) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, folderPath);
    try {
      await this.imap.updateFlags(creds, folder.path, uids, change);
      await this.messages.update({ folderId: folder.id, uid: In(uids) }, patch);
      await this.refreshUnseen(creds, folder);
    } catch (error) {
      throw this.fail(error, 'Não foi possível atualizar as mensagens.', creds.password);
    }
    return { ok: true, unread: await this.inboxUnread(account.id) };
  }

  private async relocate(
    source: MailboxFolder,
    target: MailboxFolder,
    uids: number[],
    uidMap: Map<number, number> | null,
  ) {
    for (const uid of uids) {
      const row = await this.messages.findOne({ where: { folderId: source.id, uid } });
      if (!row) continue;
      const nextUid = uidMap?.get(uid);
      if (!nextUid) {
        await this.messages.delete({ id: row.id });
        continue;
      }
      row.folderId = target.id;
      row.uid = nextUid;
      try {
        await this.messages.save(row);
      } catch {
        await this.messages.delete({ id: row.id });
      }
    }
  }

  private async refreshUnseen(creds: MailboxCredentials, folder: MailboxFolder) {
    try {
      const unseen = await this.imap.unseen(creds, folder.path);
      if (unseen != null) {
        folder.unreadCount = unseen;
        await this.folders.save(folder);
      }
    } catch {
      // A contagem local continua até a próxima sincronização.
    }
  }

  private archiveDestination(folders: MailboxFolder[]) {
    const existing = folders.find((folder) => folder.specialUse === 'archive');
    if (existing) return { path: existing.path, create: false };
    const sent = folders.find((folder) => folder.specialUse === 'sent');
    const path = sent?.path || '';
    if (path.includes('.')) {
      const prefix = path.split('.').slice(0, -1).join('.');
      return { path: prefix ? `${prefix}.Archive` : 'Archive', create: true };
    }
    if (path.includes('/')) {
      const prefix = path.split('/').slice(0, -1).join('/');
      return { path: prefix ? `${prefix}/Archive` : 'Archive', create: true };
    }
    return { path: 'Archive', create: true };
  }

  private toListItem(row: MailboxMessage) {
    return {
      uid: row.uid,
      subject: row.subject || '(sem assunto)',
      fromName: row.fromName,
      fromAddress: row.fromAddress,
      to: row.toAddresses || [],
      date: row.messageDate,
      snippet: row.snippet,
      seen: row.seen,
      flagged: row.flagged,
      answered: row.answered,
      hasAttachments: row.hasAttachments,
      threadKey: row.threadKey,
      size: row.size,
    };
  }

  private toDraft(draft: MailboxDraft, attachments: MailboxDraftAttachment[]) {
    return {
      id: draft.id,
      to: draft.toText || '',
      cc: draft.ccText || '',
      bcc: draft.bccText || '',
      subject: draft.subject || '',
      html: draft.html || '',
      mode: draft.mode,
      sourceFolder: draft.sourceFolder,
      sourceUid: draft.sourceUid,
      inReplyTo: draft.inReplyTo,
      references: draft.referencesHeader,
      includeSignature: draft.includeSignature,
      updatedAt: draft.updatedAt,
      attachments: attachments.map((file) => ({
        id: file.id,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
      })),
    };
  }

  private addressValues(value?: AddressObject | AddressObject[]): MailAddress[] {
    if (!value) return [];
    const list = Array.isArray(value) ? value : [value];
    return list.flatMap((item) =>
      (item.value || [])
        .filter((entry) => entry.address)
        .map((entry) => ({ name: entry.name || undefined, address: entry.address })),
    );
  }

  private async findAccount() {
    const rows = await this.accounts.find({ order: { id: 'ASC' }, take: 1 });
    return rows[0] || null;
  }

  private async requireAccount() {
    const account = await this.findAccount();
    if (!account) throw new NotFoundException('Nenhuma conta de e-mail configurada.');
    let password: string;
    try {
      password = this.crypto.decrypt(account.passwordCipher);
    } catch (error) {
      throw this.cryptoError(error);
    }
    return { account, creds: this.credsFrom(account, password) };
  }

  private credsFrom(account: MailboxAccount, password: string): MailboxCredentials {
    return {
      email: account.email,
      displayName: account.displayName,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      imapSecure: account.imapSecure,
      smtpHost: account.smtpHost,
      smtpPort: account.smtpPort,
      smtpSecure: account.smtpSecure,
      username: account.username,
      password,
    };
  }

  private async credentialsFromInput(dto: TestMailboxDto): Promise<MailboxCredentials> {
    let password = dto.password?.trim();
    const account = await this.findAccount();
    if (!password && account) {
      try {
        password = this.crypto.decrypt(account.passwordCipher);
      } catch (error) {
        throw this.cryptoError(error);
      }
    }
    if (!password) throw new BadRequestException('Informe a senha para testar a conexão.');
    return {
      email: dto.email?.trim() || account?.email || dto.username,
      imapHost: dto.imapHost.trim(),
      imapPort: dto.imapPort,
      imapSecure: dto.imapSecure,
      smtpHost: dto.smtpHost.trim(),
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure,
      username: dto.username.trim(),
      password,
    };
  }

  private async folderByPath(accountId: number, path: string) {
    const folder = await this.folders.findOne({
      where: { accountId, path: this.cleanPath(path) },
    });
    if (!folder || !folder.selectable) throw new NotFoundException('Pasta não encontrada.');
    return folder;
  }

  private cleanPath(path: string) {
    const value = (path || '').trim();
    if (!value || value.length > 500 || /[\0\r\n]/.test(value)) {
      throw new BadRequestException('Pasta inválida.');
    }
    return value;
  }

  private async inboxUnread(accountId: number) {
    const folders = await this.folders.find({ where: { accountId, specialUse: 'inbox' } });
    return folders.reduce((sum, folder) => sum + (folder.unreadCount || 0), 0);
  }

  private storedPath(storageName: string) {
    return join(mailboxUploadDir(), basename(storageName));
  }

  private async removeStoredFile(storageName: string) {
    await fs.unlink(this.storedPath(storageName)).catch(() => undefined);
  }

  private normalizeId(value: string) {
    return value.replace(/[<>]/g, '').trim().toLowerCase();
  }

  private cryptoError(error: unknown) {
    if (error instanceof MailboxCryptoError) return new BadRequestException(error.message);
    return new BadRequestException('Não foi possível proteger a senha da caixa.');
  }

  private describe(error: unknown) {
    return error instanceof Error ? error.message.slice(0, 180) : 'erro desconhecido';
  }

  private fail(error: unknown, fallback: string, password?: string) {
    if (error instanceof NotFoundException || error instanceof BadRequestException) return error;
    const raw = error instanceof Error ? error.message : String(error);
    const safe = password ? raw.split(password).join('***') : raw;
    this.logger.warn(safe.slice(0, 300));
    const lower = safe.toLowerCase();
    if (
      lower.includes('auth') ||
      lower.includes('invalid credentials') ||
      lower.includes('authentication')
    ) {
      return new BadRequestException(
        'Falha de autenticação. Confira usuário e senha. No Gmail, use uma senha de app com IMAP ativado.',
      );
    }
    if (
      lower.includes('timeout') ||
      lower.includes('etimedout') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound')
    ) {
      return new BadRequestException(
        'Não foi possível conectar ao servidor. Confira host, porta e TLS.',
      );
    }
    if (
      lower.includes('certificate') ||
      lower.includes('self signed') ||
      lower.includes('unable to verify')
    ) {
      return new BadRequestException(
        'O certificado TLS foi rejeitado. Confira o host ou a variável MAILBOX_TLS_REJECT_UNAUTHORIZED.',
      );
    }
    if (raw === 'MESSAGE_TOO_LARGE') {
      return new BadRequestException(
        'A mensagem é grande demais para abrir por aqui (limite de 20 MB).',
      );
    }
    if (raw === 'MESSAGE_NOT_FOUND')
      return new NotFoundException('Mensagem não encontrada nesta pasta.');
    return new BadRequestException(fallback);
  }
}
