import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Travel } from './travel.entity';
import { TravelOffer } from '../../travelOffer/entities/travelOffer.entity';
import { TravelRouteProduct } from './travelRouteProduct.entity';

@Entity()
export class TravelRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Travel, (travel) => travel.travelRoutes, { nullable: false })
  @JoinColumn()
  travel: Travel;

  @Column()
  travelId: number;

  @Column()
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  longitude: number;

  @Column({ default: 0 })
  order: number;

  @Column('decimal', { precision: 10, scale: 3 })
  distance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  loadingWeight: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unloadingWeight: number;

  @ManyToOne(() => TravelOffer, (offer) => offer.routes, { nullable: true })
  @JoinColumn()
  offer: TravelOffer;

  @Column({ nullable: true })
  offerId: number;

  @OneToMany(() => TravelRouteProduct, (routeProduct) => routeProduct.route)
  routeProduct: TravelRouteProduct[];

  @Column({ type: 'timestamp', nullable: true })
  arrivedAt: Date;

  @Column({ nullable: true })
  attachment: string;

  @Column({ nullable: true })
  coopAttachment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ✅ Soft delete column
  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deletedAt?: Date;
}