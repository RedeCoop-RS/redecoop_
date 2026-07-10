import { User } from '../../User/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, RelationId } from 'typeorm';


@Entity()
export class AuthToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('uuid', { unique: true })
    token: string;


    @Column('datetime')
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, user => user.authTokens, { nullable: false })
    @JoinColumn({ name: 'user_Id' })
    user!: User;

}