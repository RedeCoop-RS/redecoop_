import { Travel } from '@/travel/entities/travel.entity';
import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import { VehicleType } from '../../vehicleType/entities/vehicleType.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  licensePlate: string;

  @Column()
  model: string;

  @Column({ nullable: true })
  img?: string;

  @Column('float')
  volume: number;

  @Column('float')
  maximumWeight: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.vehicles, { nullable: false })
  @JoinColumn()
  cooperative: Cooperative;

  @Column()
  @RelationId((vehicle: Vehicle) => vehicle.cooperative)
  cooperativeId: number;

  @ManyToOne(() => VehicleType, (vehicleType) => vehicleType.vehicles)
  @JoinColumn()
  type: VehicleType;

  @Column()
  @RelationId((vehicle: Vehicle) => vehicle.type)
  typeId: number;

  @OneToMany(() => Travel, (travel) => travel.vehicle)
  travels: Travel[];
}
