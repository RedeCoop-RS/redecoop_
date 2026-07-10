import { BusinessDesk } from '../../businessDesk/entities/businessDesk.entity';
import { City } from '../../city/entities/city.entity';
import { CollectivePurchase } from '../../collectivePurchase/entities/collectivePurchase.entity';
import { Catalog } from '../../catalog/entities/catalog.entity';
import { Driver } from '../../driver/entities/driver.entity';
import { User } from '../../User/entities/user.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  OneToOne,
  RelationId,
} from 'typeorm';
import { Travel } from '@/travel/entities/travel.entity';
import { Business } from '@/business/entities/business.entity';
import { ConversationMessage } from '@/conversation/entities/conversationMessage.entity';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { CooperativeDebit } from '@/cooperativeDebit/entities/cooperativeDebit.entity';
import { CooperativeType } from '../enums/cooperativeType.enum';
import { CooperativeDeliveryCity } from './cooperative-delivery-city.entity';

@Entity()
export class Cooperative {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  userId!: number;

  @Column()
  companyName: string;

  @Column({ nullable: true })
  fantasyName: string;

  @Column()
  email!: string;

  @Column('mediumtext', { nullable: true })
  description?: string;

  @Column({ nullable: true })
  cnpj?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  instagram?: string;

  @Column({ nullable: true })
  facebook?: string;

  @Column({ nullable: true })
  cityId: number;

  @Column({ nullable: true })
  street?: string;

  @Column({ nullable: true })
  cep?: string;

  @Column({ nullable: true })
  number?: string;

  @Column({ nullable: true })
  neighborhood?: string;

  @Column({ nullable: true })
  complement?: string;

  @Column({ nullable: true })
  img?: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'enum', enum: CooperativeType, default: CooperativeType.SINGULAR })
  type: CooperativeType;

  @Column({ nullable: true, default: '' })
  DAP: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 0 })
  maleAssociates: number;

  @Column({ default: 0 })
  femaleAssociates: number;

  @Column({ default: 0 })
  youngAssociates: number;

  @Column({ type: 'timestamp', nullable: true })
  registrationCompletedAt: Date;

  @ManyToOne(() => City, (city) => city.cooperatives)
  @JoinColumn({ name: 'city_id' })
  city: City;

  @OneToMany(() => Driver, (driver) => driver.cooperative)
  drivers: Driver[];

  @OneToOne(() => User, (user) => user.cooperative)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Vehicle, (driver) => driver.cooperative)
  vehicles: Vehicle[];

  @OneToMany(() => Catalog, (catalog) => catalog.cooperative)
  catalogs: Catalog[];

  @OneToMany(() => BusinessDesk, (businessDesk) => businessDesk.cooperative)
  businessDesks: BusinessDesk[];

  @OneToMany(() => Travel, (travel) => travel.cooperative)
  travels: Travel[];

  @OneToMany(() => TravelOffer, (offer) => offer.cooperative)
  Traveloffers: TravelOffer[];

  @OneToMany(() => Business, (business) => business.offeringCooperative)
  business: Business[];

  @OneToMany(() => ConversationMessage, (conversationMessage) => conversationMessage.cooperative)
  messages: ConversationMessage[];

  @OneToMany(() => CooperativeDebit, (cooperativeDebit) => cooperativeDebit.cooperative)
  debits: CooperativeDebit[];

  @OneToMany(() => CooperativeDeliveryCity, (deliveryCity) => deliveryCity.cooperative)
  deliveryCities: CooperativeDeliveryCity[];
}
