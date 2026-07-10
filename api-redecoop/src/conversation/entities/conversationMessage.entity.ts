import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';

export enum MessageStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity()
export class ConversationMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { nullable: false })
  @JoinColumn()
  conversation: Conversation;

  @Column({ default: false })
  seen: boolean;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.messages, { nullable: false })
  cooperative: Cooperative;

  @Column()
  cooperativeId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.Pending })
  status: MessageStatus;

  @Column({ type: 'timestamp', nullable: true })
  revisedAt: Date;
}
