import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Cooperative } from './cooperative.entity';
import { City } from '@/city/entities/city.entity';

@Entity('cooperative_delivery_cities')
export class CooperativeDeliveryCity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cooperative, cooperative => cooperative.deliveryCities)
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;

  @ManyToOne(() => City, city => city.cooperativeDeliveries)
  @JoinColumn({ name: 'city_id' })
  city: City;
}