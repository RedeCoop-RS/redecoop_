import { Business } from '@/business/entities/business.entity';
import { BusinessDeskProduct } from '../../businessDeskProduct/entities/businessDeskProduct.entity';
import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity()
export class BusinessDesk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  description: string;

  @Column({ default: true })
  active: boolean;

  /** Soft delete (admin): row stays in DB, hidden from listings. */
  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.businessDesks, { nullable: false })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;

  @Column()
  cooperativeId: number;

  @OneToMany(() => BusinessDeskProduct, (businessDeskProduct) => businessDeskProduct.businessDesk, {
    nullable: false,
  })
  businessDeskProducts: BusinessDeskProduct[];

  @OneToMany(() => Business, (business) => business.businessDesk, {
    nullable: false,
  })
  business: Business[];
}
