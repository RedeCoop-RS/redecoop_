import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CooperationTerm } from './cooperationTerm.entity';

@Entity('cooperation_term_hospital_unit')
export class CooperationTermHospitalUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  termId: number;

  @ManyToOne(() => CooperationTerm, (term) => term.hospitalUnits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'term_id' })
  term: CooperationTerm;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'int', default: 0 })
  position: number;
}
