import { basename, join } from 'path';

export const MAILBOX_SPECIAL_USES = [
  'inbox',
  'sent',
  'drafts',
  'trash',
  'spam',
  'archive',
  'other',
] as const;

export type MailboxSpecialUse = (typeof MAILBOX_SPECIAL_USES)[number];

// Testes E2E disparam muitas ações seguidas com o mesmo usuário; em produção fica 1.
const RATE_LIMIT_SCALE = Math.max(1, Math.min(100, Number(process.env.MAILBOX_RATE_LIMIT_SCALE) || 1));

export const MAILBOX_LIMITS = {
  send: { limit: 20 * RATE_LIMIT_SCALE, windowMs: 10 * 60 * 1000 },
  test: { limit: 8 * RATE_LIMIT_SCALE, windowMs: 5 * 60 * 1000 },
  sync: { limit: 12 * RATE_LIMIT_SCALE, windowMs: 60 * 1000 },
  upload: { limit: 40 * RATE_LIMIT_SCALE, windowMs: 10 * 60 * 1000 },
};

export const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'msi',
  'vbs',
  'ps1',
  'jar',
  'apk',
  'dll',
  'js',
  'mjs',
  'svg',
]);

export function mailboxUploadDir(): string {
  const configured = process.env.MAILBOX_UPLOAD_DIR?.trim();
  return configured || join(process.cwd(), 'private-mailbox');
}

export function maxAttachmentBytes(): number {
  const parsed = Number(process.env.MAILBOX_MAX_ATTACHMENT_BYTES || 15 * 1024 * 1024);
  if (!Number.isFinite(parsed) || parsed < 1024) return 15 * 1024 * 1024;
  return Math.min(parsed, 35 * 1024 * 1024);
}

export function maxDraftBytes(): number {
  return Math.max(maxAttachmentBytes(), 25 * 1024 * 1024);
}

export function syncMessageLimit(requested?: number): number {
  const fallback = Number(process.env.MAILBOX_SYNC_MESSAGE_LIMIT || 200);
  const base = Number.isFinite(fallback) ? fallback : 200;
  const value = requested && requested > 0 ? requested : base;
  return Math.min(Math.max(value, 20), 1000);
}

export function defaultSyncIntervalSeconds(): number {
  const parsed = Number(process.env.MAILBOX_SYNC_INTERVAL_SECONDS || 60);
  if (!Number.isFinite(parsed)) return 60;
  return Math.min(Math.max(Math.round(parsed), 30), 3600);
}

export function tlsRejectUnauthorized(): boolean {
  return process.env.MAILBOX_TLS_REJECT_UNAUTHORIZED !== 'false';
}

export function safeFilename(name: string): string {
  const base = basename(name || 'anexo')
    .replace(/[^\w.\- ()\u00C0-\u024F]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180);
  return base || 'anexo';
}

/** O multer entrega o nome do arquivo lido como latin1; navegadores enviam UTF-8. */
export function uploadedFilename(name: string | undefined): string {
  if (!name || /[^\x00-\xff]/.test(name)) return name || '';
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

export function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match ? match[1] : '';
}

export function assertAllowedAttachment(filename: string, size: number) {
  const ext = extensionOf(safeFilename(filename));
  if (ext && BLOCKED_ATTACHMENT_EXTENSIONS.has(ext)) {
    throw new Error(`BLOCKED_EXT:${ext}`);
  }
  if (size <= 0) throw new Error('EMPTY_FILE');
  if (size > maxAttachmentBytes()) throw new Error('TOO_LARGE');
}
