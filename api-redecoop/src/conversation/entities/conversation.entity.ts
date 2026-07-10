import { Business } from '@/business/entities/business.entity';
import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  Not,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Repository,
  UpdateDateColumn,
  ViewColumn,
  VirtualColumn,
} from 'typeorm';
import { ConversationMessage, MessageStatus } from './conversationMessage.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cooperative, { nullable: false })
  initiatorCooperative: Cooperative;

  @RelationId((post: Conversation) => post.initiatorCooperative)
  initiatorCooperativeId: number;

  @ManyToOne(() => Cooperative, { nullable: false })
  participantCooperative: Cooperative;

  @RelationId((post: Conversation) => post.participantCooperative)
  participantCooperativeId: number;

  @Column({ nullable: true })
  title: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => ConversationMessage, (conversationMessage) => conversationMessage.conversation)
  messages: ConversationMessage[];

  @OneToOne(() => Business, (business) => business.conversation)
  business: Business;

  @VirtualColumn({
    query: (alias) =>
      `(SELECT COUNT(*) FROM conversation_message cm WHERE cm.conversation_id = ${alias}.id)`,
  })
  messageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMessage: Date;

  @Column({ default: false })
  isDirect: boolean;

  @VirtualColumn({
    query: (alias) =>
      `(SELECT IF(COUNT(*) > 0, true, false) FROM conversation_message cm WHERE cm.conversation_id = ${alias}.id AND cm.status = '${MessageStatus.Pending}')`,
  })
  awaitingMediation: boolean;
}
