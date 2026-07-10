import { City } from '../../city/entities/city.entity';
import { User } from '../../User/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  RelationId,
} from 'typeorm';

export enum VisitantType {
  PRIVATE = 'PRIVADO',
  PUBLIC = 'PUBLICO',
}

@Entity()
export class Visitant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column({ unique: true })
  email: string;

  @Column()
  cep: string;

  @Column()
  number: string;

  @Column()
  neighborhood: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'enum', enum: VisitantType, default: VisitantType.PRIVATE })
  type: VisitantType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => City, (city) => city.visitants)
  @JoinColumn()
  city: City;

  @OneToOne(() => User, (user) => user.visitant)
  @JoinColumn()
  user: User;

  @RelationId((visitant: Visitant) => visitant.user)
  userId: number;
}
