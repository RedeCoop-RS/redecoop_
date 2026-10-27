import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('mailbox_draft_attachment')
export class MailboxDraftAttachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  draftId: number;

  @Column({ length: 255 })
  filename: string;

  @Column({ length: 191, default: 'application/octet-stream' })
  contentType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ length: 255 })
  storageName: string;

  @Column({ length: 191, nullable: true })
  contentId: string;

  @CreateDateColumn()
  createdAt: Date;
}
