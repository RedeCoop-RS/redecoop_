import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface MailboxSignature {
  id: string;
  name: string;
  html: string;
}

@Entity('mailbox_account')
export class MailboxAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120, default: 'Caixa principal' })
  label: string;

  @Column({ length: 191 })
  email: string;

  @Column({ length: 191, nullable: true })
  displayName: string;

  @Column({ length: 191 })
  imapHost: string;

  @Column({ type: 'int', default: 993 })
  imapPort: number;

  @Column({ default: true })
  imapSecure: boolean;

  @Column({ length: 191 })
  smtpHost: string;

  @Column({ type: 'int', default: 465 })
  smtpPort: number;

  @Column({ default: true })
  smtpSecure: boolean;

  @Column({ length: 191 })
  username: string;

  /** AES-256-GCM. Nunca devolver este campo na API. */
  @Column({ type: 'text' })
  passwordCipher: string;

  @Column({ type: 'text', nullable: true })
  signatureHtml: string;

  @Column({ type: 'simple-json', nullable: true })
  signatures: MailboxSignature[];

  @Column({ length: 64, nullable: true })
  defaultSignatureId: string;

  @Column({ type: 'int', default: 10 })
  undoSendSeconds: number;

  @Column({ type: 'int', default: 60 })
  syncIntervalSeconds: number;

  @Column({ type: 'datetime', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
