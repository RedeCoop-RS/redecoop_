import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { randomUUID } from 'crypto';
import { AddressObject, simpleParser } from 'mailparser';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { MailboxAccount, MailboxSignature } from './entities/mailbox-account.entity';
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
import { accountSignatures, toAccountView } from './presenters/account.presenter';
import { headerFlags } from './imap/headers';
import { extractInlineImages } from './security/inline-images';
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
import { MAX_SOURCE_BYTES, PreviewRequest } from './mailbox-imap.service';
import {
  AttachOriginalDto,
  CreateFolderDto,
  FlaggedDto,
  ReceiptDto,
  RenameFolderDto,
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

    const connectionChanged =
      !existing ||
      Boolean(password) ||
      existing.imapHost !== dto.imapHost.trim() ||
      existing.imapPort !== dto.imapPort ||
      existing.imapSecure !== dto.imapSecure ||
      existing.smtpHost !== dto.smtpHost.trim() ||
      existing.smtpPort !== dto.smtpPort ||
      existing.smtpSecure !== dto.smtpSecure ||
      existing.username !== dto.username.trim();
    if (connectionChanged) {
      const plain = password || this.decryptOrFail(passwordCipher);
      await this.verifyCredentials({
        email: dto.email.trim(),
        imapHost: dto.imapHost.trim(),
        imapPort: dto.imapPort,
        imapSecure: dto.imapSecure,
        smtpHost: dto.smtpHost.trim(),
        smtpPort: dto.smtpPort,
        smtpSecure: dto.smtpSecure,
        username: dto.username.trim(),
        password: plain,
      });
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
    const signatures =
      dto.signatures === undefined && dto.signatureHtml === undefined && existing
        ? accountSignatures(existing)
        : this.normalizeSignatures(dto);
    account.signatures = signatures;
    const preferred = dto.defaultSignatureId ?? existing?.defaultSignatureId;
    account.defaultSignatureId = signatures.some((item) => item.id === preferred)
      ? preferred
      : signatures[0]?.id || null;
    account.signatureHtml =
      signatures.find((item) => item.id === account.defaultSignatureId)?.html || null;
    if (dto.undoSendSeconds !== undefined) account.undoSendSeconds = dto.undoSendSeconds;
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
    await this.verifyCredentials(creds);
    return { ok: true, message: 'IMAP e SMTP conectaram com sucesso.' };
  }

  private async verifyCredentials(creds: MailboxCredentials) {
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
    const filtered = () => {
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
      return qb;
    };

    const counts = await this.folderCounts(folder.id);
    const folderInfo = {
      path: folder.path,
      name: folder.name,
      specialUse: folder.specialUse,
      unreadCount: folder.unreadCount,
    };

    if (input.threads) {
      const groups = await filtered()
        .select('m.threadKey', 'threadKey')
        .addSelect('MAX(m.messageDate)', 'lastDate')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(CASE WHEN m.seen = 0 THEN 1 ELSE 0 END)', 'unread')
        .groupBy('m.threadKey')
        .orderBy('lastDate', input.sort === 'date_asc' ? 'ASC' : 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<{ threadKey: string; lastDate: Date; count: string; unread: string }>();
      const totalRow = await filtered()
        .select('COUNT(DISTINCT m.threadKey)', 'total')
        .getRawOne<{ total: string }>();
      const keys = groups.map((group) => group.threadKey);
      const rows = keys.length
        ? await filtered()
            .andWhere('m.threadKey IN (:...keys)', { keys })
            .orderBy('m.messageDate', 'DESC')
            .addOrderBy('m.uid', 'DESC')
            .getMany()
        : [];
      const latest = new Map<string, MailboxMessage>();
      for (const row of rows) if (!latest.has(row.threadKey)) latest.set(row.threadKey, row);
      return {
        data: groups
          .filter((group) => latest.has(group.threadKey))
          .map((group) => ({
            ...this.toListItem(latest.get(group.threadKey)),
            threadCount: Number(group.count) || 1,
            threadUnread: Number(group.unread) || 0,
          })),
        total: Number(totalRow?.total) || 0,
        page,
        limit,
        counts,
        folder: folderInfo,
      };
    }

    const qb = filtered();
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
      counts,
      folder: folderInfo,
    };
  }

  private async folderCounts(folderId: number) {
    const row = await this.messages
      .createQueryBuilder('m')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN m.seen = 0 THEN 1 ELSE 0 END)', 'unread')
      .addSelect('SUM(CASE WHEN m.flagged = 1 THEN 1 ELSE 0 END)', 'starred')
      .addSelect('SUM(CASE WHEN m.hasAttachments = 1 THEN 1 ELSE 0 END)', 'attachments')
      .where('m.folderId = :folderId', { folderId })
      .getRawOne<{ total: string; unread: string; starred: string; attachments: string }>();
    return {
      total: Number(row?.total) || 0,
      unread: Number(row?.unread) || 0,
      starred: Number(row?.starred) || 0,
      attachments: Number(row?.attachments) || 0,
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
      priority: row.priority || 'normal',
      listUnsubscribe: row.listUnsubscribe || null,
      receiptRequested: Boolean(
        row.receiptTo &&
          !row.receiptHandled &&
          folder.specialUse !== 'sent' &&
          row.receiptTo !== account.email.toLowerCase(),
      ),
      receiptTo: row.receiptTo || null,
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
    if (draft.sendingAt) throw new ConflictException('Este rascunho está sendo enviado.');
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
    if (dto.signatureId !== undefined) draft.signatureId = dto.signatureId || null;
    if (dto.priority) draft.priority = dto.priority;
    if (dto.requestReceipt !== undefined) draft.requestReceipt = dto.requestReceipt;
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
    if (dto.sendAt || (dto.delaySeconds ?? 0) > 0) return this.schedule(userId, dto);
    return this.deliver(userId, dto);
  }

  async cancelScheduled(id: number) {
    const { account } = await this.requireAccount();
    const draft = await this.drafts.findOne({ where: { id, accountId: account.id } });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    if (draft.sendingAt) {
      throw new ConflictException('A mensagem já está sendo enviada e não pode mais ser desfeita.');
    }
    draft.scheduledAt = null;
    draft.scheduledByUserId = null;
    const saved = await this.drafts.save(draft);
    const files = await this.draftFiles.find({ where: { draftId: saved.id } });
    return this.toDraft(saved, files);
  }

  /** Chamado pelo agendador: envia rascunhos cujo horário chegou. */
  async runDueScheduled() {
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const stale = await this.drafts.find({
      where: { sendingAt: LessThanOrEqual(staleBefore) },
      take: 20,
    });
    for (const draft of stale) {
      await this.drafts.update(
        { id: draft.id },
        {
          sendingAt: null,
          scheduledAt: null,
          scheduleError: 'O envio foi interrompido. Confira a pasta Enviados antes de reenviar.',
        },
      );
    }

    const due = await this.drafts.find({
      where: { scheduledAt: LessThanOrEqual(new Date()), sendingAt: IsNull() },
      order: { scheduledAt: 'ASC' },
      take: 5,
    });
    let sent = 0;
    for (const draft of due) {
      const claim = await this.drafts.update(
        { id: draft.id, sendingAt: IsNull(), scheduledAt: Not(IsNull()) },
        { sendingAt: new Date() },
      );
      if (!claim.affected) continue;
      try {
        await this.deliver(draft.scheduledByUserId, { draftId: draft.id });
        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message.slice(0, 480) : 'Falha no envio agendado.';
        await this.drafts.update(
          { id: draft.id },
          { sendingAt: null, scheduledAt: null, scheduleError: message },
        );
        this.logger.warn(`Envio agendado falhou (rascunho ${draft.id}): ${message}`);
      }
    }
    return sent;
  }

  private async schedule(userId: number, dto: SendMailDto) {
    const when = dto.sendAt
      ? new Date(dto.sendAt)
      : new Date(Date.now() + (dto.delaySeconds ?? 0) * 1000);
    if (Number.isNaN(when.getTime())) throw new BadRequestException('Data de envio inválida.');
    if (dto.sendAt && when.getTime() < Date.now() + 30_000) {
      throw new BadRequestException('Escolha um horário pelo menos 1 minuto no futuro.');
    }
    if (when.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('O agendamento pode ser de no máximo um ano.');
    }
    const saved = await this.saveDraft(dto, dto.draftId);
    const draft = await this.drafts.findOne({ where: { id: saved.id } });
    this.recipients(draft.toText, draft.ccText, draft.bccText);
    draft.scheduledAt = when;
    draft.scheduledByUserId = userId;
    draft.scheduleError = null;
    await this.drafts.save(draft);
    return {
      ok: true,
      scheduled: true,
      undoable: !dto.sendAt,
      draftId: draft.id,
      sendAt: when.toISOString(),
    };
  }

  private recipients(toText?: string, ccText?: string, bccText?: string) {
    const to = parseAddressList(toText);
    const cc = parseAddressList(ccText);
    const bcc = parseAddressList(bccText);
    if (!to.length && !cc.length && !bcc.length) {
      throw new BadRequestException('Informe ao menos um destinatário.');
    }
    if (to.length + cc.length + bcc.length > 50) {
      throw new BadRequestException('No máximo 50 destinatários por mensagem.');
    }
    return { to, cc, bcc };
  }

  private async deliver(userId: number | null, dto: SendMailDto) {
    const { account, creds } = await this.requireAccount();
    const draft = dto.draftId
      ? await this.drafts.findOne({ where: { id: dto.draftId, accountId: account.id } })
      : null;
    if (dto.draftId && !draft) throw new NotFoundException('Rascunho não encontrado.');

    const { to, cc, bcc } = this.recipients(
      dto.to ?? draft?.toText,
      dto.cc ?? draft?.ccText,
      dto.bcc ?? draft?.bccText,
    );

    const includeSignature = dto.includeSignature ?? draft?.includeSignature ?? true;
    const signatureId = dto.signatureId ?? draft?.signatureId ?? account.defaultSignatureId;
    const signatures = accountSignatures(account);
    const signature =
      signatures.find((item) => item.id === signatureId) ||
      (signatureId ? undefined : signatures[0]);
    const domain = (account.email.split('@')[1] || 'redecoop.local').replace(/[^a-z0-9.-]/gi, '');
    let html = sanitizeMailboxHtml(
      withSignature(dto.html ?? draft?.html ?? '', signature?.html, includeSignature),
      { allowRemoteImages: true },
    ).html;
    let inline: ReturnType<typeof extractInlineImages>;
    try {
      inline = extractInlineImages(html, domain, maxDraftBytes());
    } catch {
      throw new BadRequestException('As imagens coladas no texto passaram do limite de tamanho.');
    }
    html = inline.html;
    const subject = (dto.subject ?? draft?.subject ?? '').trim() || '(sem assunto)';
    const messageId = `<${randomUUID()}@${domain}>`;
    const files = draft ? await this.draftFiles.find({ where: { draftId: draft.id } }) : [];
    const attachments = [...inline.attachments];
    for (const file of files) {
      attachments.push({
        filename: file.filename,
        contentType: file.contentType,
        content: await fs.readFile(this.storedPath(file.storageName)),
        cid: file.contentId || undefined,
      });
    }
    const priority = dto.priority ?? (draft?.priority as SendMailDto['priority']) ?? 'normal';
    const requestReceipt = dto.requestReceipt ?? draft?.requestReceipt ?? false;
    const mode = dto.mode || draft?.mode || '';

    let sentId = messageId;
    let sentCopy: Buffer;
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
        priority,
        receiptTo: requestReceipt ? account.email : undefined,
      });
      sentId = result.messageId;
      sentCopy = result.sentCopy;
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
        await this.imap.append(creds, sentFolder.path, sentCopy, ['\\Seen']);
      } catch (error) {
        this.logger.warn(
          `E-mail enviado, mas não foi copiado para Enviados: ${this.describe(error)}`,
        );
        warning = 'A mensagem foi enviada, mas não apareceu na pasta Enviados.';
      }
    }

    const sourceFolder = dto.sourceFolder || draft?.sourceFolder;
    const sourceUid = dto.sourceUid || draft?.sourceUid;
    const flag = mode.startsWith('reply') ? '\\Answered' : mode === 'forward' ? '$Forwarded' : null;
    if (sourceFolder && sourceUid && flag) {
      try {
        await this.imap.updateFlags(creds, sourceFolder, [sourceUid], { add: [flag] });
        if (flag === '\\Answered') {
          const folder = await this.folderByPath(account.id, sourceFolder);
          await this.messages.update({ folderId: folder.id, uid: sourceUid }, { answered: true });
        }
      } catch {
        // O envio já aconteceu; a marcação na mensagem original é complementar.
      }
    }

    if (draft) {
      for (const file of files) await this.removeStoredFile(file.storageName);
      await this.draftFiles.delete({ draftId: draft.id });
      await this.drafts.delete({ id: draft.id });
    }

    return { ok: true, messageId: sentId, warning };
  }

  async markAllSeen(folderPath: string) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, folderPath);
    try {
      await this.imap.markAllSeen(creds, folder.path);
      await this.messages.update({ folderId: folder.id }, { seen: true });
      folder.unreadCount = 0;
      await this.folders.save(folder);
      await this.refreshUnseen(creds, folder);
    } catch (error) {
      throw this.fail(error, 'Não foi possível marcar tudo como lido.', creds.password);
    }
    return { ok: true, unread: await this.inboxUnread(account.id) };
  }

  async emptyFolder(folderPath: string) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, folderPath);
    if (folder.specialUse !== 'trash' && folder.specialUse !== 'spam') {
      throw new BadRequestException('Só é possível esvaziar a lixeira ou a pasta de spam.');
    }
    try {
      const removed = await this.imap.deleteAll(creds, folder.path);
      await this.messages.delete({ folderId: folder.id });
      folder.unreadCount = 0;
      folder.totalCount = 0;
      await this.folders.save(folder);
      return { ok: true, removed };
    } catch (error) {
      throw this.fail(error, 'Não foi possível esvaziar a pasta.', creds.password);
    }
  }

  async notSpam(folderPath: string, uids: number[]) {
    const { account } = await this.requireAccount();
    const inbox = await this.folders.findOne({
      where: { accountId: account.id, specialUse: 'inbox' },
    });
    if (!inbox) throw new BadRequestException('Não encontrei a caixa de entrada.');
    return this.move({ folder: folderPath, uids, targetFolder: inbox.path });
  }

  async createFolder(dto: CreateFolderDto) {
    const { account, creds } = await this.requireAccount();
    const remote = await this.imap.listFolders(creds).catch((error) => {
      throw this.fail(error, 'Não foi possível ler as pastas.', creds.password);
    });
    const name = dto.name.trim();
    let path = name;
    if (dto.parent) {
      const parent = remote.find((item) => item.path === this.cleanPath(dto.parent));
      if (!parent) throw new NotFoundException('Pasta mãe não encontrada.');
      if (name.includes(parent.delimiter || '/')) {
        throw new BadRequestException('O nome da pasta não pode conter o separador de pastas.');
      }
      path = `${parent.path}${parent.delimiter || '/'}${name}`;
    } else {
      const delimiter = remote.find((item) => item.delimiter)?.delimiter || '/';
      if (name.includes(delimiter)) {
        throw new BadRequestException('O nome da pasta não pode conter o separador de pastas.');
      }
    }
    if (remote.some((item) => item.path.toLowerCase() === path.toLowerCase())) {
      throw new BadRequestException('Já existe uma pasta com esse nome.');
    }
    try {
      await this.imap.createFolder(creds, path);
    } catch (error) {
      throw this.fail(error, 'Não foi possível criar a pasta.', creds.password);
    }
    await this.refreshFolderList(account.id, creds);
    return { ok: true, path };
  }

  async renameFolder(dto: RenameFolderDto) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, dto.path);
    this.assertCustomFolder(folder);
    const remote = await this.imap.listFolders(creds).catch((error) => {
      throw this.fail(error, 'Não foi possível ler as pastas.', creds.password);
    });
    const current = remote.find((item) => item.path === folder.path);
    const delimiter = current?.delimiter || '/';
    const name = dto.name.trim();
    if (name.includes(delimiter)) {
      throw new BadRequestException('O nome da pasta não pode conter o separador de pastas.');
    }
    const parts = folder.path.split(delimiter);
    parts[parts.length - 1] = name;
    const nextPath = parts.join(delimiter);
    if (nextPath === folder.path) return { ok: true, path: folder.path };
    if (remote.some((item) => item.path.toLowerCase() === nextPath.toLowerCase())) {
      throw new BadRequestException('Já existe uma pasta com esse nome.');
    }
    try {
      await this.imap.renameFolder(creds, folder.path, nextPath);
    } catch (error) {
      throw this.fail(error, 'Não foi possível renomear a pasta.', creds.password);
    }
    await this.messages.delete({ folderId: folder.id });
    await this.refreshFolderList(account.id, creds);
    return { ok: true, path: nextPath };
  }

  async deleteFolder(path: string) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, path);
    this.assertCustomFolder(folder);
    const remote = await this.imap.listFolders(creds).catch((error) => {
      throw this.fail(error, 'Não foi possível ler as pastas.', creds.password);
    });
    const delimiter = remote.find((item) => item.path === folder.path)?.delimiter || '/';
    if (remote.some((item) => item.path.startsWith(`${folder.path}${delimiter}`))) {
      throw new BadRequestException('Exclua ou mova as subpastas antes de excluir esta pasta.');
    }
    try {
      await this.imap.deleteFolder(creds, folder.path);
    } catch (error) {
      throw this.fail(error, 'Não foi possível excluir a pasta.', creds.password);
    }
    await this.messages.delete({ folderId: folder.id });
    await this.refreshFolderList(account.id, creds);
    return { ok: true };
  }

  async messageSource(folderPath: string, uid: number) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, folderPath);
    try {
      const content = await this.imap.fetchSource(creds, folder.path, uid);
      return {
        filename: safeFilename(`mensagem-${uid}.eml`),
        contentType: 'message/rfc822',
        content,
      };
    } catch (error) {
      throw this.fail(error, 'Não foi possível abrir o original da mensagem.', creds.password);
    }
  }

  async quota() {
    const { creds } = await this.requireAccount();
    try {
      const quota = await this.imap.quota(creds);
      return { supported: Boolean(quota), ...(quota || { usage: 0, limit: 0 }) };
    } catch (error) {
      this.logger.warn(`Cota indisponível: ${this.describe(error)}`);
      return { supported: false, usage: 0, limit: 0 };
    }
  }

  async contacts(query?: string) {
    const account = await this.findAccount();
    if (!account) return [];
    const term = this.fold(query || '').trim();
    const own = new Set([account.email.toLowerCase(), account.username.toLowerCase()]);
    const rows = await this.messages.find({
      where: { accountId: account.id },
      select: ['fromName', 'fromAddress', 'toAddresses', 'ccAddresses', 'messageDate'],
      order: { messageDate: 'DESC' },
      take: 3000,
    });
    const audits = await this.audits.find({
      select: ['recipients'],
      order: { createdAt: 'DESC' },
      take: 500,
    });
    const scores = new Map<string, { name?: string; address: string; score: number }>();
    const add = (address?: string | null, name?: string | null, weight = 1) => {
      const key = (address || '').trim().toLowerCase();
      if (!key || !key.includes('@') || own.has(key)) return;
      const current = scores.get(key) || { address: key, score: 0 };
      current.score += weight;
      if (name && !current.name && name.toLowerCase() !== key) current.name = name;
      scores.set(key, current);
    };
    for (const row of rows) {
      add(row.fromAddress, row.fromName, 1);
      for (const item of row.toAddresses || []) add(item.address, item.name, 2);
      for (const item of row.ccAddresses || []) add(item.address, item.name, 1);
    }
    for (const audit of audits) {
      for (const address of (audit.recipients || '').split(',')) add(address, undefined, 3);
    }
    return [...scores.values()]
      .filter(
        (item) =>
          !term || this.fold(item.address).includes(term) || this.fold(item.name || '').includes(term),
      )
      .sort((a, b) => b.score - a.score || a.address.localeCompare(b.address))
      .slice(0, 8)
      .map((item) => ({ name: item.name || null, address: item.address }));
  }

  /** Encaminhar com os anexos originais ou com a mensagem inteira como .eml. */
  async attachOriginal(draftId: number, dto: AttachOriginalDto) {
    const { account, creds } = await this.requireAccount();
    const draft = await this.drafts.findOne({ where: { id: draftId, accountId: account.id } });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    const folder = await this.folderByPath(account.id, dto.folder);
    let source: Buffer;
    try {
      source = await this.imap.fetchSource(creds, folder.path, dto.uid);
    } catch (error) {
      throw this.fail(error, 'Não foi possível ler a mensagem original.', creds.password);
    }
    const files: Array<{ filename: string; contentType: string; content: Buffer }> = [];
    if (dto.asAttachment) {
      const parsed = await simpleParser(source);
      const base = (parsed.subject || 'mensagem').slice(0, 80);
      files.push({
        filename: safeFilename(`${base}.eml`),
        contentType: 'message/rfc822',
        content: source,
      });
    } else {
      const parsed = await simpleParser(source);
      for (const [index, file] of (parsed.attachments || []).entries()) {
        if (file.related) continue;
        files.push({
          filename: safeFilename(file.filename || `anexo-${index + 1}`),
          contentType: file.contentType || 'application/octet-stream',
          content: file.content,
        });
      }
    }
    const current = await this.draftFiles.find({ where: { draftId } });
    let total = current.reduce((sum, item) => sum + item.size, 0);
    await fs.mkdir(mailboxUploadDir(), { recursive: true });
    for (const file of files) {
      total += file.content.length;
      if (total > maxDraftBytes()) {
        throw new BadRequestException('A soma dos anexos deste rascunho passou do limite.');
      }
      const storageName = `${randomUUID()}.bin`;
      await fs.writeFile(this.storedPath(storageName), file.content, { mode: 0o600 });
      await this.draftFiles.save(
        this.draftFiles.create({
          draftId,
          filename: file.filename,
          contentType: file.contentType,
          size: file.content.length,
          storageName,
        }),
      );
    }
    const attachments = await this.draftFiles.find({ where: { draftId } });
    return this.toDraft(draft, attachments);
  }

  async handleReceipt(userId: number, dto: ReceiptDto) {
    const { account, creds } = await this.requireAccount();
    const folder = await this.folderByPath(account.id, dto.folder);
    const row = await this.messages.findOne({ where: { folderId: folder.id, uid: dto.uid } });
    if (!row) throw new NotFoundException('Mensagem não encontrada nesta pasta.');
    if (!row.receiptTo || row.receiptHandled) return { ok: true, sent: false };
    if (dto.send) {
      this.rate.consume(
        `mailbox:send:${userId}`,
        MAILBOX_LIMITS.send.limit,
        MAILBOX_LIMITS.send.windowMs,
      );
      const domain = (account.email.split('@')[1] || 'redecoop.local').replace(/[^a-z0-9.-]/gi, '');
      const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const text = `Sua mensagem "${row.subject || '(sem assunto)'}" foi lida por ${account.email} em ${when}.`;
      try {
        await this.smtp.send(creds, {
          from: formatAddress({ name: account.displayName || undefined, address: account.email }),
          to: [row.receiptTo],
          subject: `Lida: ${row.subject || '(sem assunto)'}`.slice(0, 998),
          html: `<p>${text.replace(/[<>&]/g, '')}</p>`,
          text,
          messageId: `<${randomUUID()}@${domain}>`,
          inReplyTo: row.messageId || undefined,
          references: row.messageId || undefined,
        });
      } catch (error) {
        throw this.fail(error, 'Não foi possível enviar a confirmação de leitura.', creds.password);
      }
      await this.audits.save(
        this.audits.create({
          userId,
          accountId: account.id,
          action: 'RECEIPT',
          recipients: row.receiptTo,
          subject: `Lida: ${row.subject || ''}`.slice(0, 998),
          messageId: row.messageId,
        }),
      );
    }
    row.receiptHandled = true;
    await this.messages.save(row);
    await this.imap
      .updateFlags(creds, folder.path, [row.uid], { add: ['$MDNSent'] })
      .catch(() => undefined);
    return { ok: true, sent: dto.send };
  }

  private decryptOrFail(cipher: string) {
    try {
      return this.crypto.decrypt(cipher);
    } catch (error) {
      throw this.cryptoError(error);
    }
  }

  private assertCustomFolder(folder: MailboxFolder) {
    if (folder.specialUse !== 'other' || folder.path.toUpperCase() === 'INBOX') {
      throw new BadRequestException('Pastas do sistema não podem ser renomeadas nem excluídas.');
    }
  }

  private async refreshFolderList(accountId: number, creds: MailboxCredentials) {
    try {
      await this.upsertFolders(accountId, await this.imap.listFolders(creds));
    } catch (error) {
      this.logger.warn(`Não foi possível atualizar as pastas: ${this.describe(error)}`);
    }
  }

  private fold(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private normalizeSignatures(dto: UpsertMailboxAccountDto): MailboxSignature[] {
    if (Array.isArray(dto.signatures)) {
      const seen = new Set<string>();
      return dto.signatures
        .filter((item) => item.id && !seen.has(item.id) && seen.add(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name.trim().slice(0, 80) || 'Assinatura',
          html: sanitizeMailboxHtml(item.html, { allowRemoteImages: true }).html,
        }));
    }
    const legacy = dto.signatureHtml?.trim();
    return legacy
      ? [
          {
            id: 'principal',
            name: 'Principal',
            html: sanitizeMailboxHtml(legacy, { allowRemoteImages: true }).html,
          },
        ]
      : [];
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
    await this.fillPreviews(creds, folder, fetched.messages);
    await this.refreshUnseen(creds, folder);
    return fetched.messages.length;
  }

  private async fillPreviews(
    creds: MailboxCredentials,
    folder: MailboxFolder,
    envelopes: RemoteEnvelope[],
  ) {
    const candidates = envelopes.filter((item) => item.previewPart);
    if (!candidates.length) return;
    const rows = await this.messages.find({
      where: { folderId: folder.id, uid: In(candidates.map((item) => item.uid)) },
      select: ['id', 'uid', 'snippet', 'bodyCached'],
    });
    const missing = new Set(
      rows.filter((row) => !row.snippet && !row.bodyCached).map((row) => row.uid),
    );
    const requests: PreviewRequest[] = candidates
      .filter((item) => missing.has(item.uid))
      .slice(-200)
      .map((item) => ({ uid: item.uid, ...item.previewPart }));
    if (!requests.length) return;
    try {
      const previews = await this.imap.fetchPreviews(creds, folder.path, requests);
      for (const row of rows) {
        const snippet = previews.get(row.uid);
        if (snippet) await this.messages.update({ id: row.id }, { snippet });
      }
    } catch (error) {
      this.logger.warn(`Prévias não carregadas: ${this.describe(error)}`);
    }
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
      if (envelope.headersCached && !row.bodyCached) {
        row.priority = envelope.priority || 'normal';
        row.listUnsubscribe = envelope.listUnsubscribe || null;
        row.receiptTo = envelope.receiptTo || null;
        row.headersCached = true;
      }
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
    const flags = headerFlags(
      (parsed.headerLines || []).map((header) => header.line).join('\r\n'),
    );
    row.priority = flags.priority;
    row.listUnsubscribe = flags.listUnsubscribe || null;
    row.receiptTo = flags.receiptTo || null;
    row.headersCached = true;
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
      priority: row.priority || 'normal',
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
      signatureId: draft.signatureId || null,
      priority: draft.priority || 'normal',
      requestReceipt: Boolean(draft.requestReceipt),
      scheduledAt: draft.scheduledAt || null,
      sending: Boolean(draft.sendingAt),
      scheduleError: draft.scheduleError || null,
      updatedAt: draft.updatedAt,
      attachments: attachments.map((file) => ({
        id: file.id,
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
        contentId: file.contentId || null,
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
    const response = String(
      (error as { responseText?: string; response?: string })?.responseText ||
        (error as { response?: string })?.response ||
        '',
    ).toLowerCase();
    if (raw === 'MESSAGE_TOO_LARGE') {
      return new BadRequestException(
        `A mensagem é grande demais para abrir por aqui (limite de ${Math.round(MAX_SOURCE_BYTES / 1024 / 1024)} MB).`,
      );
    }
    if (response.includes('alreadyexists') || lower.includes('alreadyexists')) {
      return new BadRequestException('Já existe uma pasta com esse nome.');
    }
    if (response.includes('overquota') || lower.includes('quota exceeded')) {
      return new BadRequestException('A caixa de e-mail está sem espaço (cota cheia).');
    }
    if (/\b552\b/.test(lower) || lower.includes('message size exceeds')) {
      return new BadRequestException('A mensagem passou do tamanho aceito pelo servidor de envio.');
    }
    if (/\b55[03]\b/.test(lower) && lower.includes('recipient')) {
      return new BadRequestException('O servidor de envio recusou um dos destinatários.');
    }
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
    if (
      lower.includes('econnreset') ||
      lower.includes('socket closed') ||
      lower.includes('connection closed') ||
      lower.includes('connection not available') ||
      lower.includes('unexpected close') ||
      lower.includes('epipe')
    ) {
      return new BadRequestException(
        'A conexão com o servidor de e-mail caiu. Tente novamente em instantes.',
      );
    }
    if (raw === 'MESSAGE_NOT_FOUND')
      return new NotFoundException('Mensagem não encontrada nesta pasta.');
    return new BadRequestException(fallback);
  }
}
