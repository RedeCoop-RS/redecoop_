import { AuthToken } from '../../auth/entities/authToken.entity';
import { ResetPassword } from '../../auth/entities/resetPassword.entity';
import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import { Driver } from '../../driver/entities/driver.entity';
import { Visitant } from '../../visitant/entities/visitant.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'ADMIN',
  COOPERATIVE = 'COOPERATIVE',
  DRIVER = 'DRIVER',
  VISITANT = 'VISITANT',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191, unique: true })
  username: string;

  @Column({ length: 191 })
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Driver, (driver) => driver.user, { nullable: true, onDelete: 'CASCADE' })
  driver: Driver;

  @OneToOne(() => Cooperative, (cooperative) => cooperative.user, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  cooperative: Cooperative;

  @OneToOne(() => Visitant, (visitant) => visitant.user, { nullable: true, onDelete: 'CASCADE' })
  visitant: Visitant;

  @OneToMany(() => AuthToken, (authToken) => authToken.user, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  authTokens: AuthToken[];

  @OneToMany(() => ResetPassword, (resetPassword) => resetPassword.user, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  passwordResetTokens: ResetPassword[];
}
