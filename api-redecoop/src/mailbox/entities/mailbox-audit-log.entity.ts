import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mailbox_audit_log')
@Index('IDX_mailbox_audit_created', ['createdAt'])
export class MailboxAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number;

  @Column({ type: 'int', nullable: true })
  accountId: number;

  @Column({ length: 32 })
  action: string;

  @Column({ type: 'text' })
  recipients: string;

  @Column({ length: 998, default: '' })
  subject: string;

  @Column({ length: 512, nullable: true })
  messageId: string;

  @CreateDateColumn()
  createdAt: Date;
}
