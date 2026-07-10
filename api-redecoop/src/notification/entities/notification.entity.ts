import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationType {
  NEW_MESSAGE = 'new_message',
  BUSINESS_DESK = 'business_desk',
  COLLECTIVE_PURCHASE = 'collective_purchase',
  TRAVEL_OFFER = 'travel_offer',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message: string;

  @ManyToOne(() => Cooperative, { nullable: false })
  cooperative: Cooperative;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'enum', enum: NotificationType, nullable: false })
  type: NotificationType;

  @Column({ default: false })
  isRead: boolean;
}
