import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mailbox_folder')
@Index('UQ_mailbox_folder_account_path', ['accountId', 'path'], { unique: true })
export class MailboxFolder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accountId: number;

  /** Binário: no IMAP "Ação" e "Acao" (ou "Projetos" e "projetos") são pastas diferentes. */
  @Column({ length: 500, charset: 'utf8mb4', collation: 'utf8mb4_bin' })
  path: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 32, default: 'other' })
  specialUse: string;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column({ type: 'int', default: 0 })
  totalCount: number;

  @Column({ length: 40, nullable: true })
  uidValidity: string;

  @Column({ default: true })
  selectable: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
