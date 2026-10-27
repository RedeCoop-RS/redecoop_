import { createHash } from 'crypto';
import { OutgoingAttachment } from '../mailbox.types';

const DATA_IMAGE = /(<img\b[^>]*?\bsrc\s*=\s*)(["'])data:(image\/(?:png|jpe?g|gif|webp));base64,([a-z0-9+/=\s]+)\2/gi;

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Troca imagens embutidas em data: por anexos inline (cid:), como os clientes de
 * e-mail esperam. Imagens iguais viram um único anexo.
 */
export function extractInlineImages(
  html: string,
  domain: string,
  maxBytes: number,
): { html: string; attachments: OutgoingAttachment[]; bytes: number } {
  const attachments: OutgoingAttachment[] = [];
  const byHash = new Map<string, string>();
  let bytes = 0;
  const output = (html || '').replace(
    DATA_IMAGE,
    (whole, prefix: string, quote: string, type: string, data: string) => {
      const content = Buffer.from(data.replace(/\s+/g, ''), 'base64');
      if (!content.length) return whole;
      const hash = createHash('sha256').update(content).digest('hex').slice(0, 24);
      let cid = byHash.get(hash);
      if (!cid) {
        bytes += content.length;
        if (bytes > maxBytes) throw new Error('INLINE_TOO_LARGE');
        cid = `img-${hash}@${domain}`;
        byHash.set(hash, cid);
        const kind = type.toLowerCase();
        attachments.push({
          filename: `imagem-${attachments.length + 1}.${EXTENSIONS[kind] || 'png'}`,
          content,
          contentType: kind === 'image/jpg' ? 'image/jpeg' : kind,
          cid,
        });
      }
      return `${prefix}${quote}cid:${cid}${quote}`;
    },
  );
  return { html: output, attachments, bytes };
}
