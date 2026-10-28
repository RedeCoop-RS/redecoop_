import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator } from 'typeorm';
import { MailboxService } from './mailbox.service';
import { MailboxAccount } from './entities/mailbox-account.entity';
import { MailboxFolder } from './entities/mailbox-folder.entity';
import { MailboxMessage } from './entities/mailbox-message.entity';
import { MailboxDraft } from './entities/mailbox-draft.entity';
import { MailboxDraftAttachment } from './entities/mailbox-draft-attachment.entity';
import { MailboxAuditLog } from './entities/mailbox-audit-log.entity';
import { MailboxCryptoService } from './crypto/mailbox-crypto.service';
import { MailboxImapService } from './mailbox-imap.service';
import { MailboxSmtpService } from './mailbox-smtp.service';
import { MailboxRateLimitService } from './security/mailbox-rate-limit.service';

type Row = Record<string, unknown> & { id?: number };

function matches(row: Row, where: Record<string, unknown> = {}) {
  return Object.entries(where).every(([key, expected]) => {
    const value = row[key];
    if (expected instanceof FindOperator) {
      const operator = expected as FindOperator<unknown>;
      switch (operator.type) {
        case 'isNull':
          return value === null || value === undefined;
        case 'lessThanOrEqual':
          return value instanceof Date && value.getTime() <= (operator.value as Date).getTime();
        case 'in':
          return (operator.value as unknown[]).includes(value);
        case 'not': {
          const inner = operator.child || operator.value;
          if (inner instanceof FindOperator && inner.type === 'isNull') {
            return value !== null && value !== undefined;
          }
          return value !== inner;
        }
        default:
          throw new Error(`operador não suportado: ${operator.type}`);
      }
    }
    return value === expected;
  });
}

function memoryRepo(rows: Row[] = []) {
  let nextId = rows.length + 1;
  return {
    rows,
    create: jest.fn((value?: Row) => ({ ...(value || {}) })),
    find: jest.fn(async (options?: { where?: Record<string, unknown>; take?: number }) => {
      const found = rows.filter((row) => matches(row, options?.where));
      return options?.take ? found.slice(0, options.take) : found;
    }),
    findOne: jest.fn(
      async (options: { where: Record<string, unknown> }) =>
        rows.find((row) => matches(row, options.where)) || null,
    ),
    count: jest.fn(async (options?: { where?: Record<string, unknown> }) =>
      rows.filter((row) => matches(row, options?.where)).length,
    ),
    save: jest.fn(async (value: Row) => {
      if (!value.id) {
        value.id = nextId++;
        value.updatedAt = new Date();
        rows.push(value);
        return value;
      }
      const index = rows.findIndex((row) => row.id === value.id);
      if (index >= 0) rows[index] = Object.assign(rows[index], value);
      else rows.push(value);
      return rows[index >= 0 ? index : rows.length - 1];
    }),
    update: jest.fn(async (where: Record<string, unknown>, patch: Row) => {
      let affected = 0;
      for (const row of rows) {
        if (matches(row, where)) {
          Object.assign(row, patch);
          affected += 1;
        }
      }
      return { affected };
    }),
    delete: jest.fn(async (where: Record<string, unknown> | number[]) => {
      const before = rows.length;
      const keep = rows.filter((row) =>
        Array.isArray(where) ? !where.includes(row.id as number) : !matches(row, where),
      );
      rows.splice(0, rows.length, ...keep);
      return { affected: before - rows.length };
    }),
    remove: jest.fn(),
  };
}

const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('MailboxService – recursos de webmail', () => {
  let service: MailboxService;
  let accounts: ReturnType<typeof memoryRepo>;
  let folders: ReturnType<typeof memoryRepo>;
  let messages: ReturnType<typeof memoryRepo>;
  let drafts: ReturnType<typeof memoryRepo>;
  let audits: ReturnType<typeof memoryRepo>;
  const smtp = { send: jest.fn(), verify: jest.fn() };
  const imap = {
    test: jest.fn(),
    append: jest.fn(),
    updateFlags: jest.fn(),
    listFolders: jest.fn(),
    renameFolder: jest.fn(),
    createFolder: jest.fn(),
  };

  const account = {
    email: 'admin@redecoop.test',
    imapHost: 'mail.redecoop.test',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'mail.redecoop.test',
    smtpPort: 465,
    smtpSecure: true,
    username: 'admin@redecoop.test',
    password: 'senha-secreta-local',
  };

  beforeEach(async () => {
    process.env.MAILBOX_ENCRYPTION_KEY = 'chave-testes-webmail';
    accounts = memoryRepo();
    folders = memoryRepo([
      { id: 1, accountId: 1, path: 'INBOX', name: 'INBOX', specialUse: 'inbox', selectable: true },
      { id: 2, accountId: 1, path: 'Sent', name: 'Sent', specialUse: 'sent', selectable: true },
      { id: 3, accountId: 1, path: 'Trash', name: 'Trash', specialUse: 'trash', selectable: true },
      { id: 4, accountId: 1, path: 'Pedidos', name: 'Pedidos', specialUse: 'other', selectable: true },
    ]);
    messages = memoryRepo();
    drafts = memoryRepo();
    audits = memoryRepo();
    for (const mock of [smtp.send, smtp.verify, imap.test, imap.append, imap.updateFlags]) {
      mock.mockReset();
    }
    smtp.send.mockResolvedValue({
      messageId: '<ok@redecoop.test>',
      raw: Buffer.from('raw'),
      sentCopy: Buffer.from('copy'),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        MailboxService,
        MailboxCryptoService,
        MailboxRateLimitService,
        { provide: getRepositoryToken(MailboxAccount), useValue: accounts },
        { provide: getRepositoryToken(MailboxFolder), useValue: folders },
        { provide: getRepositoryToken(MailboxMessage), useValue: messages },
        { provide: getRepositoryToken(MailboxDraft), useValue: drafts },
        { provide: getRepositoryToken(MailboxDraftAttachment), useValue: memoryRepo() },
        { provide: getRepositoryToken(MailboxAuditLog), useValue: audits },
        { provide: MailboxImapService, useValue: imap },
        { provide: MailboxSmtpService, useValue: smtp },
      ],
    }).compile();
    service = moduleRef.get(MailboxService);
    await service.saveAccount(1, {
      ...account,
      signatures: [
        { id: 'formal', name: 'Formal', html: '<p>Att, Diretoria RedeCoop</p>' },
        { id: 'curta', name: 'Curta', html: '<p>Abraço!</p>' },
      ],
      defaultSignatureId: 'curta',
    });
    imap.test.mockClear();
    smtp.verify.mockClear();
  });

  describe('salvar a conta', () => {
    it('testa IMAP e SMTP de novo quando a conexão muda e não salva se falhar', async () => {
      imap.test.mockRejectedValueOnce(new Error('Authentication failed'));
      await expect(
        service.saveAccount(1, { ...account, imapHost: 'outro.servidor.test', password: '' }),
      ).rejects.toThrow(/IMAP \(outro\.servidor\.test:993\)/);
      expect((accounts.rows[0] as { imapHost: string }).imapHost).toBe('mail.redecoop.test');
    });

    it('não reconecta quando só a assinatura muda e mantém as assinaturas sem o campo', async () => {
      await service.saveAccount(1, { ...account, password: '', undoSendSeconds: 5 });
      expect(imap.test).not.toHaveBeenCalled();
      const view = await service.getAccountView();
      expect(view.signatures?.map((item) => item.id)).toEqual(['formal', 'curta']);
      expect(view.defaultSignatureId).toBe('curta');
      expect(view.undoSendSeconds).toBe(5);
      expect(JSON.stringify(view)).not.toContain('senha-secreta-local');
    });
  });

  describe('enviar', () => {
    it('usa a assinatura escolhida e transforma imagens coladas em anexos inline', async () => {
      await service.send(1, {
        to: 'ana@redecoop.test',
        subject: 'Foto',
        html: `<p>Veja</p><img src="data:image/png;base64,${PIXEL}">`,
        signatureId: 'formal',
        priority: 'high',
        requestReceipt: true,
      });
      const mail = smtp.send.mock.calls[0][1];
      expect(mail.html).toContain('Diretoria RedeCoop');
      expect(mail.html).not.toContain('Abraço');
      expect(mail.html).not.toContain('data:image');
      expect(mail.attachments).toHaveLength(1);
      expect(mail.html).toContain(`cid:${mail.attachments[0].cid}`);
      expect(mail.priority).toBe('high');
      expect(mail.receiptTo).toBe('admin@redecoop.test');
      expect(imap.append).toHaveBeenCalledWith(
        expect.anything(),
        'Sent',
        Buffer.from('copy'),
        ['\\Seen'],
      );
    });

    it('desfazer envio: agenda, cancela e não envia', async () => {
      const result = await service.send(1, {
        to: 'ana@redecoop.test',
        subject: 'Desfazer',
        html: '<p>x</p>',
        delaySeconds: 10,
      });
      expect(result).toMatchObject({ scheduled: true, undoable: true });
      expect(smtp.send).not.toHaveBeenCalled();
      const draftId = (result as { draftId: number }).draftId;
      await service.cancelScheduled(draftId);
      (drafts.rows[0] as { scheduledAt?: Date }).scheduledAt = undefined;
      expect(await service.runDueScheduled()).toBe(0);
      expect(smtp.send).not.toHaveBeenCalled();
      expect(drafts.rows).toHaveLength(1);
    });

    it('envia o agendado uma única vez quando chega a hora', async () => {
      const result = await service.send(1, {
        to: 'ana@redecoop.test',
        subject: 'Agendado',
        html: '<p>x</p>',
        delaySeconds: 1,
      });
      const draftId = (result as { draftId: number }).draftId;
      (drafts.rows[0] as { scheduledAt: Date }).scheduledAt = new Date(Date.now() - 1000);
      const [first, second] = await Promise.all([
        service.runDueScheduled(),
        service.runDueScheduled(),
      ]);
      expect(first + second).toBe(1);
      expect(smtp.send).toHaveBeenCalledTimes(1);
      expect(drafts.rows.find((row) => row.id === draftId)).toBeUndefined();
      expect(audits.rows[0]).toMatchObject({ userId: 1, action: 'SEND' });
    });

    it('não deixa desfazer quando o envio já começou', async () => {
      const result = await service.send(1, {
        to: 'ana@redecoop.test',
        html: '<p>x</p>',
        delaySeconds: 10,
      });
      (drafts.rows[0] as { sendingAt: Date }).sendingAt = new Date();
      await expect(
        service.cancelScheduled((result as { draftId: number }).draftId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('guarda o erro no rascunho quando o envio agendado falha', async () => {
      smtp.send.mockRejectedValueOnce(new Error('ECONNRESET'));
      await service.send(1, { to: 'ana@redecoop.test', html: '<p>x</p>', delaySeconds: 1 });
      (drafts.rows[0] as { scheduledAt: Date }).scheduledAt = new Date(Date.now() - 1000);
      await service.runDueScheduled();
      expect(drafts.rows[0]).toMatchObject({ scheduledAt: null, sendingAt: null });
      expect(String(drafts.rows[0].scheduleError)).toMatch(/conexão/i);
    });

    it('recusa agendamento no passado e sem destinatário', async () => {
      await expect(
        service.send(1, { to: 'ana@redecoop.test', sendAt: new Date(Date.now() - 60000).toISOString() }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.send(1, { to: '', html: '<p>x</p>', delaySeconds: 5 })).rejects.toThrow(
        /destinatário/,
      );
    });
  });

  describe('pastas', () => {
    it('não esvazia a caixa de entrada', async () => {
      await expect(service.emptyFolder('INBOX')).rejects.toThrow(/lixeira ou a pasta de spam/);
    });

    it('não renomeia pastas do sistema', async () => {
      await expect(service.renameFolder({ path: 'Sent', name: 'Outra' })).rejects.toThrow(
        /sistema/,
      );
      await expect(service.deleteFolder('INBOX')).rejects.toThrow(/sistema/);
    });

    it('renomeia pasta própria respeitando o separador do servidor', async () => {
      imap.listFolders.mockResolvedValue([
        { path: 'Pedidos', name: 'Pedidos', delimiter: '.', flags: [], selectable: true },
      ]);
      await expect(service.renameFolder({ path: 'Pedidos', name: 'a.b' })).rejects.toThrow(
        /separador/,
      );
      const result = await service.renameFolder({ path: 'Pedidos', name: 'Pedidos 2026' });
      expect(result.path).toBe('Pedidos 2026');
      expect(imap.renameFolder).toHaveBeenCalledWith(expect.anything(), 'Pedidos', 'Pedidos 2026');
    });

    it('cria pasta e devolve o caminho real com o prefixo do namespace (Hostinger: INBOX.)', async () => {
      imap.listFolders.mockResolvedValue([
        { path: 'INBOX', name: 'INBOX', delimiter: '.', flags: [], selectable: true },
        { path: 'INBOX.Sent', name: 'Sent', delimiter: '.', flags: [], selectable: true },
      ]);
      imap.createFolder.mockResolvedValueOnce({ path: 'INBOX.Safra', created: true });
      const result = await service.createFolder({ name: 'Safra' });
      expect(result.path).toBe('INBOX.Safra');
      imap.createFolder.mockResolvedValueOnce({ path: 'INBOX.Safra', created: false });
      await expect(service.createFolder({ name: 'Safra' })).rejects.toThrow(/Já existe/);
    });
  });

  it('sugere contatos por frequência, sem acento e sem o próprio endereço', async () => {
    messages.rows.push(
      {
        accountId: 1,
        fromName: 'João Ação',
        fromAddress: 'joao@coop.test',
        toAddresses: [{ address: 'admin@redecoop.test' }],
        ccAddresses: [],
      },
      {
        accountId: 1,
        fromName: 'Admin',
        fromAddress: 'admin@redecoop.test',
        toAddresses: [{ name: 'Joana', address: 'joana@coop.test' }],
        ccAddresses: [],
      },
    );
    const found = await service.contacts('joa');
    expect(found.map((item) => item.address)).toEqual(['joana@coop.test', 'joao@coop.test']);
    expect((await service.contacts('acao'))[0]).toEqual({ name: 'João Ação', address: 'joao@coop.test' });
    expect((await service.contacts('admin')).length).toBe(0);
  });
});
