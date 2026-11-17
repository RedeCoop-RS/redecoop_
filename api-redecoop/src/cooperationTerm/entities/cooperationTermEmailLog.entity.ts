import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CooperationTermEmailStatus } from '../enums/cooperationTerm.enums';
import { CooperationTerm } from './cooperationTerm.entity';

export interface CooperationTermRecipient {
  email: string;
  name: string;
  kind: 'cooperative' | 'buyer';
}

@Entity('cooperation_term_email_log')
export class CooperationTermEmailLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  termId: number;

  @ManyToOne(() => CooperationTerm, (term) => term.emailLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'term_id' })
  term: CooperationTerm;

  @Column({ type: 'int', nullable: true })
  sentByUserId: number | null;

  @Column({ type: 'enum', enum: CooperationTermEmailStatus })
  status: CooperationTermEmailStatus;

  @Column({ type: 'json' })
  recipients: CooperationTermRecipient[];

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
