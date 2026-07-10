import { Business } from '@/business/entities/business.entity';
import { City } from '../../city/entities/city.entity';
import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  RelationId,
} from 'typeorm';

@Entity()
export class CollectivePurchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('json')
  products: any;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => City, (city) => city.collectivePurchases, { nullable: false })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column()
  cityId: number;

  @OneToMany(() => Business, (business) => business.collectivePurchase)
  business: Business[];

  @ManyToOne(() => Cooperative, { nullable: false })
  @JoinColumn()
  cooperative: Cooperative;

  @RelationId((cp: CollectivePurchase) => cp.cooperative)
  cooperativeId: number;
}
