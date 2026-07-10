import { Travel } from '@/travel/entities/travel.entity';
import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import { User } from '../../User/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  RelationId,
} from 'typeorm';

export enum BloodType {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

export enum CNHCategory {
  ACC = 'ACC',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  AB = 'AB',
  AC = 'AC',
  AD = 'AD',
  AE = 'AE',
}

@Entity()
export class Driver {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cooperativeId!: number;

  @Column()
  userId!: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  cpf: string;

  @Column({
    type: 'enum',
    enum: CNHCategory,
  })
  cnhCategory: CNHCategory;

  @Column()
  numberCnh: string;

  @Column({
    type: 'enum',
    enum: BloodType,
  })
  bloodType: BloodType;

  @Column()
  securityContact: string;

  @Column({ type: 'date' })
  dateBirth: Date;

  @Column({ nullable: true })
  img?: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.driver)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.drivers)
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;

  @OneToMany(() => Travel, (travel) => travel.driver)
  travels: Travel[];
}
