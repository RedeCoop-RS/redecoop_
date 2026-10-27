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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
