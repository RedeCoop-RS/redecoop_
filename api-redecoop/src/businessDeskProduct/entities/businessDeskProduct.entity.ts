import { Product } from '@/product/entities/product.entity';
import { BusinessDesk } from '../../businessDesk/entities/businessDesk.entity';
import { Catalog } from '../../catalog/entities/catalog.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class BusinessDeskProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float')
  weight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => BusinessDesk, (businessDesk) => businessDesk.businessDeskProducts, {
    nullable: false,
  })
  @JoinColumn()
  businessDesk: BusinessDesk;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn()
  product: Product;
}
