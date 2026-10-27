import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';

export class MailboxCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailboxCryptoError';
  }
}

export function mailboxEncryptionKey(): Buffer {
  const raw = process.env.MAILBOX_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new MailboxCryptoError(
      'Defina MAILBOX_ENCRYPTION_KEY no servidor (mínimo de 16 caracteres) antes de salvar a senha da caixa.',
    );
  }
  return createHash('sha256').update(raw).digest();
}

@Injectable()
export class MailboxCryptoService {
  encrypt(plain: string): string {
    const key = mailboxEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(
      ':',
    );
  }

  decrypt(payload: string): string {
    try {
      const [version, ivB64, tagB64, dataB64] = (payload || '').split(':');
      if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
        throw new Error('formato inválido');
      }
      const decipher = createDecipheriv(
        'aes-256-gcm',
        mailboxEncryptionKey(),
        Buffer.from(ivB64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
      ]);
      return plain.toString('utf8');
    } catch (error) {
      if (error instanceof MailboxCryptoError) throw error;
      throw new MailboxCryptoError(
        'Não foi possível ler a senha salva. Confira se MAILBOX_ENCRYPTION_KEY é a mesma usada ao salvar.',
      );
    }
  }
}
