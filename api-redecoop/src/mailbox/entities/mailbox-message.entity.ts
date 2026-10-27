import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MailAddress } from '../imap/addresses';

export interface AttachmentMeta {
  index: number;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  related?: boolean;
}

@Entity('mailbox_message')
@Index('UQ_mailbox_message_folder_uid', ['folderId', 'uid'], { unique: true })
@Index('IDX_mailbox_message_thread', ['accountId', 'threadKey'])
@Index('IDX_mailbox_message_folder_date', ['folderId', 'messageDate'])
export class MailboxMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accountId: number;

  @Column()
  folderId: number;

  @Column({ type: 'int', unsigned: true })
  uid: number;

  @Column({ length: 512, nullable: true })
  messageId: string;

  @Column({ length: 512 })
  threadKey: string;

  @Column({ length: 512, nullable: true })
  inReplyTo: string;

  @Column({ type: 'text', nullable: true })
  referencesHeader: string;

  @Column({ length: 998, default: '' })
  subject: string;

  @Column({ length: 255, nullable: true })
  fromName: string;

  @Column({ length: 255, nullable: true })
  fromAddress: string;

  @Column({ type: 'simple-json', nullable: true })
  toAddresses: MailAddress[];

  @Column({ type: 'simple-json', nullable: true })
  ccAddresses: MailAddress[];

  @Column({ type: 'simple-json', nullable: true })
  replyToAddresses: MailAddress[];

  @Column({ type: 'datetime', nullable: true })
  messageDate: Date;

  @Column({ length: 500, nullable: true })
  snippet: string;

  @Column({ default: false })
  seen: boolean;

  @Column({ default: false })
  flagged: boolean;

  @Column({ default: false })
  answered: boolean;

  @Column({ default: false })
  hasAttachments: boolean;

  @Column({ type: 'int', default: 0 })
  size: number;

  @Column({ type: 'mediumtext', nullable: true })
  textBody: string;

  @Column({ type: 'mediumtext', nullable: true })
  htmlBody: string;

  @Column({ type: 'simple-json', nullable: true })
  attachmentsMeta: AttachmentMeta[];

  @Column({ default: false })
  bodyCached: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
