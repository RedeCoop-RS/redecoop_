import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { Driver } from '@/driver/entities/driver.entity';
import { Vehicle } from '@/vehicle/entities/vehicle.entity';
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
  VirtualColumn,
} from 'typeorm';
import { TravelRoute } from './travelRoute.entity';
import { OfferStatus, TravelOffer } from '@/travelOffer/entities/travelOffer.entity';

export enum TravelStatus {
  Awaiting = 'awaiting',
  Completed = 'completed',
  Canceled = 'canceled',
  InProgress = 'in_progress',
}

@Entity()
export class Travel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp' })
  startDateTime: Date;

  @Column({ type: 'enum', enum: TravelStatus, default: TravelStatus.Awaiting })
  status: TravelStatus;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Driver, (driver) => driver.travels, { nullable: false })
  @JoinColumn()
  driver: Driver;

  @Column()
  driverId: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.travels, { nullable: false })
  @JoinColumn()
  vehicle: Vehicle;

  @Column()
  vehicleId: number;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.travels, { nullable: false })
  @JoinColumn()
  cooperative: Cooperative;

  @Column()
  cooperativeId: number;

  @OneToMany(() => TravelRoute, (travelRoute) => travelRoute.travel, { cascade: true })
  travelRoutes: TravelRoute[];

  @OneToMany(() => TravelOffer, (offer) => offer.travel)
  offers: TravelOffer[];

  @VirtualColumn({
    query: (alias) =>
      `SELECT SUM(tr.distance) FROM travel_route tr 
       LEFT JOIN travel_offer offer ON offer.travel_id = ${alias}.id 
       WHERE tr.travel_id = ${alias}.id 
       AND (offer.status = '${OfferStatus.Confirmed}' OR tr.offer_id IS NULL)`,
  })
  totalDistance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ✅ Soft delete column
  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deletedAt?: Date;
}