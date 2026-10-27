import { MessageStructureObject } from 'imapflow';
import { MailAddress } from './imap/addresses';

export interface MailboxCredentials {
  email: string;
  displayName?: string | null;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string;
}

export interface RemoteFolder {
  path: string;
  name: string;
  specialUse?: string;
  flags: string[];
  selectable: boolean;
  messages?: number;
  unseen?: number;
  uidValidity?: string;
}

export interface RemoteEnvelope {
  uid: number;
  messageId?: string;
  inReplyTo?: string;
  subject: string;
  fromName?: string;
  fromAddress?: string;
  to: MailAddress[];
  cc: MailAddress[];
  replyTo: MailAddress[];
  date?: Date;
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  hasAttachments: boolean;
  size: number;
}

export interface OutgoingAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface OutgoingMail {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  attachments?: OutgoingAttachment[];
}

export type { MessageStructureObject };
