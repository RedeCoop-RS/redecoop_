import { MailboxAccount } from '../entities/mailbox-account.entity';

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
