import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export class BlogCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlogCryptoError';
  }
}

/** Mesmo AES-256-GCM da caixa de e-mail (`v1:iv:tag:data`). */
export function blogEncryptionKey(): Buffer {
  const raw = (process.env.GHOST_ENCRYPTION_KEY || process.env.MAILBOX_ENCRYPTION_KEY || '').trim();
  if (!raw || raw.length < 16) {
    throw new BlogCryptoError(
      'Defina GHOST_ENCRYPTION_KEY ou MAILBOX_ENCRYPTION_KEY (mínimo de 16 caracteres) antes de salvar a Admin API key.',
    );
  }
  return createHash('sha256').update(raw).digest();
}

export class BlogCryptoService {
  encrypt(plain: string): string {
    const key = blogEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(payload: string): string {
    try {
      const [version, ivB64, tagB64, dataB64] = (payload || '').split(':');
      if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('formato inválido');
      const decipher = createDecipheriv('aes-256-gcm', blogEncryptionKey(), Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    } catch (error) {
      if (error instanceof BlogCryptoError) throw error;
      throw new BlogCryptoError(
        'Não foi possível ler a Admin API key salva. Confira se a chave de criptografia é a mesma usada ao salvar.',
      );
    }
  }
}
