import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { TravelRoute } from './travelRoute.entity';
import { Product } from '@/product/entities/product.entity';

@Entity()
export class TravelRouteProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TravelRoute, (route) => route.routeProduct, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  route: TravelRoute;

  @ManyToOne(() => Product, (route) => route.routeProduct, { nullable: false })
  @JoinColumn()
  product: Product;

  @Column()
  @RelationId((trp: TravelRouteProduct) => trp.product)
  productId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  loadedWeight: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unloadedWeight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
