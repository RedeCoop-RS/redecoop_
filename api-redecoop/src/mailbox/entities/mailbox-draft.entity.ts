import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mailbox_draft')
export class MailboxDraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accountId: number;

  @Column({ type: 'text', nullable: true })
  toText: string;

  @Column({ type: 'text', nullable: true })
  ccText: string;

  @Column({ type: 'text', nullable: true })
  bccText: string;

  @Column({ length: 998, default: '' })
  subject: string;

  @Column({ type: 'mediumtext', nullable: true })
  html: string;

  @Column({ length: 32, default: 'new' })
  mode: string;

  @Column({ length: 500, nullable: true })
  sourceFolder: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  sourceUid: number;

  @Column({ length: 512, nullable: true })
  inReplyTo: string;

  @Column({ type: 'text', nullable: true })
  referencesHeader: string;

  @Column({ default: true })
  includeSignature: boolean;

  @Column({ length: 64, nullable: true })
  signatureId: string;

  @Column({ length: 8, default: 'normal' })
  priority: string;

  @Column({ default: false })
  requestReceipt: boolean;

  @Column({ type: 'datetime', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'int', nullable: true })
  scheduledByUserId: number;

  @Column({ type: 'datetime', nullable: true })
  sendingAt: Date;

  @Column({ length: 500, nullable: true })
  scheduleError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
