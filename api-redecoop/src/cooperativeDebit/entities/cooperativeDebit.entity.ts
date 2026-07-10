import { Business } from '@/business/entities/business.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DebitStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELED = 'canceled',
}

@Entity()
export class CooperativeDebit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cooperativeId: number;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.debits, { nullable: false })
  @JoinColumn()
  cooperative: Cooperative;

  @OneToOne(() => Business, (business) => business.debit)
  business: Business;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 255 })
  description: string; // Descrição do item

  @Column({ type: 'enum', enum: DebitStatus, default: DebitStatus.PENDING })
  status: DebitStatus; // Status do pagamento

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
