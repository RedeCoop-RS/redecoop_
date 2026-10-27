import { BadRequestException, HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { MAILBOX_LIMITS } from './mailbox.constants';

describe('MailboxService', () => {
  const originalKey = process.env.MAILBOX_ENCRYPTION_KEY;
  let service: MailboxService;
  let stored: MailboxAccount | null;
  let audits: Array<Record<string, unknown>>;
  const smtp = { send: jest.fn(), verify: jest.fn() };
  const imap = { test: jest.fn(), append: jest.fn(), updateFlags: jest.fn() };

  beforeEach(async () => {
    process.env.MAILBOX_ENCRYPTION_KEY = 'chave-super-admin-mailbox';
    stored = null;
    audits = [];
    smtp.send.mockReset();
    smtp.send.mockResolvedValue({ messageId: '<enviado@redecoop.rs>', raw: Buffer.from('raw') });

    const accounts = {
      find: jest.fn(async () => (stored ? [stored] : [])),
      create: jest.fn((value) => ({ ...(value || {}) })),
      save: jest.fn(async (value) => {
        stored = { id: stored?.id || 1, ...value };
        return stored;
      }),
      delete: jest.fn(),
    };
    const folders = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
    };
    const messages = { update: jest.fn() };
    const drafts = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      delete: jest.fn(),
    };
    const draftFiles = { find: jest.fn(async () => []), delete: jest.fn() };
    const auditRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        audits.push(value);
        return value;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MailboxService,
        MailboxCryptoService,
        MailboxRateLimitService,
        { provide: getRepositoryToken(MailboxAccount), useValue: accounts },
        { provide: getRepositoryToken(MailboxFolder), useValue: folders },
        { provide: getRepositoryToken(MailboxMessage), useValue: messages },
        { provide: getRepositoryToken(MailboxDraft), useValue: drafts },
        { provide: getRepositoryToken(MailboxDraftAttachment), useValue: draftFiles },
        { provide: getRepositoryToken(MailboxAuditLog), useValue: auditRepo },
        { provide: MailboxImapService, useValue: imap },
        { provide: MailboxSmtpService, useValue: smtp },
      ],
    }).compile();

    service = moduleRef.get(MailboxService);
  });

  afterAll(() => {
    process.env.MAILBOX_ENCRYPTION_KEY = originalKey;
  });

  const dto = {
    email: 'contato@redecooprs.com.br',
    imapHost: 'imap.hostinger.com',
    imapPort: 993,
    imapSecure: true,
    smtpHost: 'smtp.hostinger.com',
    smtpPort: 465,
    smtpSecure: true,
    username: 'contato@redecooprs.com.br',
    password: 'senha-de-app-hostinger',
    signatureHtml: '<p>RedeCoop</p>',
  };

  it('grava a senha cifrada e não a devolve', async () => {
    const view = await service.saveAccount(1, dto);
    expect(view.configured).toBe(true);
    expect(view.email).toBe(dto.email);
    expect(JSON.stringify(view)).not.toContain('senha-de-app-hostinger');
    expect(stored?.passwordCipher).toBeTruthy();
    expect(stored?.passwordCipher).not.toContain('senha-de-app-hostinger');
    expect(view.hasPassword).toBe(true);
  });

  it('mantém a senha anterior quando o campo vem vazio', async () => {
    await service.saveAccount(1, dto);
    const cipher = stored?.passwordCipher;
    const view = await service.saveAccount(1, { ...dto, password: '   ' });
    expect(stored?.passwordCipher).toBe(cipher);
    expect(JSON.stringify(view)).not.toContain('senha-de-app');
  });

  it('exige senha na primeira configuração', async () => {
    await expect(service.saveAccount(1, { ...dto, password: undefined })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('envia, registra auditoria e não inclui a senha no log', async () => {
    await service.saveAccount(1, dto);
    const result = await service.send(1, {
      to: 'eduardo@redecoop.rs',
      cc: 'copia@redecoop.rs',
      subject: 'Pedido',
      html: '<p>Olá<script>alert(1)</script></p>',
      includeSignature: true,
    });

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe('<enviado@redecoop.rs>');
    expect(smtp.send).toHaveBeenCalledTimes(1);
    const payload = smtp.send.mock.calls[0][1];
    expect(payload.html).not.toContain('<script');
    expect(payload.html).toContain('RedeCoop');
    expect(payload.to).toEqual(['eduardo@redecoop.rs']);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      userId: 1,
      action: 'SEND',
      recipients: 'eduardo@redecoop.rs, copia@redecoop.rs',
      subject: 'Pedido',
    });
    expect(JSON.stringify(audits[0])).not.toContain('senha-de-app-hostinger');
  });

  describe('testConnection', () => {
    const testDto = {
      email: dto.email,
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapSecure: dto.imapSecure,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpSecure: dto.smtpSecure,
      username: dto.username,
      password: dto.password,
    };

    beforeEach(() => {
      imap.test.mockReset().mockResolvedValue(undefined);
      smtp.verify.mockReset().mockResolvedValue(undefined);
    });

    it('valida IMAP e SMTP da Hostinger sem gravar a conta', async () => {
      const result = await service.testConnection(1, testDto);
      expect(result.ok).toBe(true);
      expect(imap.test).toHaveBeenCalledWith(
        expect.objectContaining({
          imapHost: 'imap.hostinger.com',
          imapPort: 993,
          imapSecure: true,
          username: dto.email,
          password: dto.password,
        }),
      );
      expect(smtp.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          smtpHost: 'smtp.hostinger.com',
          smtpPort: 465,
          smtpSecure: true,
        }),
      );
      expect(stored).toBeNull();
    });

    it('usa a senha salva quando o campo vem vazio', async () => {
      await service.saveAccount(1, dto);
      await service.testConnection(1, { ...testDto, password: '' });
      expect(imap.test.mock.calls[0][0].password).toBe(dto.password);
    });

    it('exige senha quando ainda não há conta', async () => {
      await expect(
        service.testConnection(1, { ...testDto, password: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(imap.test).not.toHaveBeenCalled();
    });

    it('indica falha de IMAP sem vazar a senha e sem testar SMTP', async () => {
      imap.test.mockRejectedValue(new Error(`Authentication failed for ${dto.password}`));
      const error = await service.testConnection(1, testDto).catch((value) => value);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('IMAP (imap.hostinger.com:993)');
      expect(error.message).toContain('Falha de autenticação');
      expect(error.message).not.toContain(dto.password);
      expect(smtp.verify).not.toHaveBeenCalled();
    });

    it('indica falha de SMTP depois de IMAP aprovado', async () => {
      smtp.verify.mockRejectedValue(new Error('connect ETIMEDOUT'));
      const error = await service.testConnection(1, testDto).catch((value) => value);
      expect(error.message).toContain('SMTP (smtp.hostinger.com:465)');
      expect(error.message).toContain('Confira host, porta e TLS');
    });
  });

  it('aplica limite de envio', async () => {
    await service.saveAccount(1, dto);
    const body = { to: 'eduardo@redecoop.rs', subject: 'Oi', html: '<p>Oi</p>' };
    for (let index = 0; index < MAILBOX_LIMITS.send.limit; index += 1) {
      await service.send(1, body);
    }
    await expect(service.send(1, body)).rejects.toBeInstanceOf(HttpException);
  });
});
