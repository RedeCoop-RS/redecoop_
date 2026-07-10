import { User } from '../../User/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';


@Entity()
export class ResetPassword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  userId: number;

  @Column()
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('datetime')
  expiresAt: Date;

  @ManyToOne(() => User, user => user.passwordResetTokens)
  @JoinColumn()
  user: User;
}