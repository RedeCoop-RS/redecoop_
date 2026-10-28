import { BlogCryptoError, BlogCryptoService } from './blog-crypto.service';

describe('BlogCryptoService', () => {
  const originalGhost = process.env.GHOST_ENCRYPTION_KEY;
  const originalMailbox = process.env.MAILBOX_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.GHOST_ENCRYPTION_KEY = originalGhost;
    process.env.MAILBOX_ENCRYPTION_KEY = originalMailbox;
  });

  it('cifra e lê com GHOST_ENCRYPTION_KEY', () => {
    process.env.GHOST_ENCRYPTION_KEY = 'chave-do-blog-ghost-teste';
    process.env.MAILBOX_ENCRYPTION_KEY = 'outra-chave-de-email-123';
    const crypto = new BlogCryptoService();
    const cipher = crypto.encrypt('id:segredo');
    expect(cipher.startsWith('v1:')).toBe(true);
    expect(cipher).not.toContain('segredo');
    expect(crypto.decrypt(cipher)).toBe('id:segredo');
  });

  it('usa MAILBOX_ENCRYPTION_KEY quando a do blog não existe', () => {
    delete process.env.GHOST_ENCRYPTION_KEY;
    process.env.MAILBOX_ENCRYPTION_KEY = 'chave-compartilhada-mailbox';
    const crypto = new BlogCryptoService();
    expect(crypto.decrypt(crypto.encrypt('abc'))).toBe('abc');
  });

  it('recusa chave curta e payload adulterado', () => {
    process.env.GHOST_ENCRYPTION_KEY = 'curta';
    expect(() => new BlogCryptoService().encrypt('x')).toThrow(BlogCryptoError);
    process.env.GHOST_ENCRYPTION_KEY = 'chave-do-blog-ghost-teste';
    expect(() => new BlogCryptoService().decrypt('v1:bad')).toThrow(/Não foi possível ler/);
  });
});
