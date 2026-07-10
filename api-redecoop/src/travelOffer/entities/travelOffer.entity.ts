import {
  Column,
  CreateDateColumn,
  DeleteDateColumn, // <-- adicionado
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { Travel } from '../../travel/entities/travel.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { TravelRoute } from '../../travel/entities/travelRoute.entity';
import { Business } from '@/business/entities/business.entity';

export enum OfferStatus {
  Awaiting = 'awaiting',
  Confirmed = 'confirmed',
  Rejected = 'rejected',
  Negotiating = 'negotiating',
  ConfirmedPendingRoutes = 'confirmedPendingRoutes',
}

export class ChangeLog {
  title!: string;
  createdAt!: Date;
  content?: string;
}

@Entity()
export class TravelOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Travel, (travel) => travel.offers, { nullable: false })
  @JoinColumn()
  travel: Travel;

  @OneToOne(() => Business, (business) => business.travelOffer)
  business: Business;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.Traveloffers, { nullable: false })
  @JoinColumn()
  cooperative: Cooperative;

  @Column()
  cooperativeId: number;

  @OneToMany(() => TravelRoute, (travelRoute) => travelRoute.offer, { cascade: true })
  routes: TravelRoute[];

  @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.Awaiting })
  status: OfferStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true }) // <-- aqui
  deletedAt?: Date;

  @VirtualColumn({
    query: (alias) =>
      `SELECT SUM(\`distance\`) FROM \`travel_route\` WHERE \`offer_id\` = ${alias}.id`,
  })
  totalDistance: number;

  @Column({ type: 'json', nullable: true })
  changelogs: ChangeLog[];
}