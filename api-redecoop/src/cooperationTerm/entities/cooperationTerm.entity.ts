import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CooperationTermModel, CooperationTermStatus } from '../enums/cooperationTerm.enums';
import { CooperationTermHospitalUnit } from './cooperationTermHospitalUnit.entity';
import { CooperationTermItem } from './cooperationTermItem.entity';
import { CooperationTermEmailLog } from './cooperationTermEmailLog.entity';

@Entity('cooperation_term')
export class CooperationTerm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  familyId: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 80 })
  processNumber: string;

  @Column({ type: 'varchar', length: 255 })
  buyerInstitution: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  buyerEmail: string | null;

  @Column({ type: 'enum', enum: CooperationTermModel })
  model: CooperationTermModel;

  @Column({ type: 'enum', enum: CooperationTermStatus, default: CooperationTermStatus.DRAFT })
  status: CooperationTermStatus;

  @Column({ type: 'boolean', default: false })
  divisionReleased: boolean;

  @Column({ type: 'datetime', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  signedByUserId: number | null;

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'int', nullable: true })
  predecessorId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CooperationTermHospitalUnit, (unit) => unit.term, { cascade: true })
  hospitalUnits: CooperationTermHospitalUnit[];

  @OneToMany(() => CooperationTermItem, (item) => item.term, { cascade: true })
  items: CooperationTermItem[];

  @OneToMany(() => CooperationTermEmailLog, (log) => log.term)
  emailLogs: CooperationTermEmailLog[];
}
