import { BusinessDesk } from '@/businessDesk/entities/businessDesk.entity';
import { CollectivePurchase } from '@/collectivePurchase/entities/collectivePurchase.entity';
import { Conversation } from '@/conversation/entities/conversation.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { CooperativeDebit } from '@/cooperativeDebit/entities/cooperativeDebit.entity';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';

export enum BusinessStatus {
  Negotiating = 'negotiating',
  Confirmed = 'confirmed',
  Done = 'done',
  Canceled = 'canceled',
}

export enum BusinessType {
  CC = 'CC',
  BN = 'BN',
  V = 'V',
}

@Entity()
export class Business {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.travels, { nullable: false })
  @JoinColumn()
  offeringCooperative: Cooperative;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.travels, { nullable: false })
  @JoinColumn()
  requestingCooperative: Cooperative;

  @Column()
  requestingCooperativeId: number;

  @Column()
  offeringCooperativeId: number;

  @ManyToOne(() => TravelOffer, (travelOffer) => travelOffer.business, { nullable: true })
  @JoinColumn()
  travelOffer?: TravelOffer;

  @Column({ nullable: true })
  travelOfferId: number;

  @ManyToOne(() => CollectivePurchase, (collectivePurchase) => collectivePurchase.business, {
    nullable: true,
  })
  @JoinColumn()
  collectivePurchase?: CollectivePurchase;

  @Column({ nullable: true })
  debitId: number;

  @OneToOne(() => CooperativeDebit, (debit) => debit.business, { nullable: true })
  @JoinColumn()
  debit: CooperativeDebit;

  @ManyToOne(() => BusinessDesk, (businessDesk) => businessDesk.business, { nullable: true })
  @JoinColumn()
  businessDesk: BusinessDesk;

  @OneToOne(() => Conversation, (conversation) => conversation.business, { nullable: false })
  @JoinColumn()
  conversation: Conversation;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fee: number;

  @Column({ type: 'enum', enum: BusinessType, nullable: false })
  type: BusinessType;

  @Column({ type: 'enum', enum: BusinessStatus, default: BusinessStatus.Negotiating })
  status: BusinessStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
