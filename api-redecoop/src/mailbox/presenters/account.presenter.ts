import { MailboxAccount, MailboxSignature } from '../entities/mailbox-account.entity';

export function accountSignatures(account: MailboxAccount): MailboxSignature[] {
  if (Array.isArray(account.signatures) && account.signatures.length) return account.signatures;
  if (account.signatureHtml?.trim()) {
    return [{ id: 'principal', name: 'Principal', html: account.signatureHtml }];
  }
  return [];
}

export interface AccountView {
  configured: boolean;
  id?: number;
  label?: string;
  email?: string;
  displayName?: string | null;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  username?: string;
  hasPassword: boolean;
  signatureHtml?: string;
  signatures?: MailboxSignature[];
  defaultSignatureId?: string | null;
  undoSendSeconds?: number;
  syncIntervalSeconds?: number;
  lastSyncAt?: Date | null;
  lastError?: string | null;
  unread: number;
}

const SECRET_KEYS = ['password', 'passwordCipher', 'pass'];

export function toAccountView(account: MailboxAccount | null, unread = 0): AccountView {
  if (!account) {
    return { configured: false, hasPassword: false, unread };
  }

  const view: AccountView = {
    configured: true,
    id: account.id,
    label: account.label,
    email: account.email,
    displayName: account.displayName,
    imapHost: account.imapHost,
    imapPort: account.imapPort,
    imapSecure: account.imapSecure,
    smtpHost: account.smtpHost,
    smtpPort: account.smtpPort,
    smtpSecure: account.smtpSecure,
    username: account.username,
    hasPassword: Boolean(account.passwordCipher),
    signatureHtml: account.signatureHtml || '',
    signatures: accountSignatures(account),
    defaultSignatureId:
      account.defaultSignatureId || accountSignatures(account)[0]?.id || null,
    undoSendSeconds: account.undoSendSeconds ?? 10,
    syncIntervalSeconds: account.syncIntervalSeconds,
    lastSyncAt: account.lastSyncAt,
    lastError: account.lastError,
    unread,
  };

  for (const key of SECRET_KEYS) {
    delete (view as unknown as Record<string, unknown>)[key];
  }
  return view;
}
