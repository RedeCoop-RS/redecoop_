import { MailboxCryptoError, MailboxCryptoService } from './mailbox-crypto.service';

describe('MailboxCryptoService', () => {
  const service = new MailboxCryptoService();
  const original = process.env.MAILBOX_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.MAILBOX_ENCRYPTION_KEY = 'chave-super-admin-mailbox';
  });

  afterAll(() => {
    process.env.MAILBOX_ENCRYPTION_KEY = original;
  });

  it('criptografa e descriptografa a senha', () => {
    const cipher = service.encrypt('senha-de-app');
    expect(cipher.startsWith('v1:')).toBe(true);
    expect(cipher).not.toContain('senha-de-app');
    expect(service.decrypt(cipher)).toBe('senha-de-app');
  });

  it('gera cifras diferentes para a mesma senha', () => {
    expect(service.encrypt('abc123456789')).not.toBe(service.encrypt('abc123456789'));
  });

  it('recusa chave curta e payload adulterado', () => {
    process.env.MAILBOX_ENCRYPTION_KEY = 'curta';
    expect(() => service.encrypt('senha-valida')).toThrow(MailboxCryptoError);

    process.env.MAILBOX_ENCRYPTION_KEY = 'chave-super-admin-mailbox';
    const cipher = service.encrypt('senha-valida');
    expect(() => service.decrypt(`${cipher}xx`)).toThrow(MailboxCryptoError);
  });
});
