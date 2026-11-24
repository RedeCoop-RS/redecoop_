import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../domain/decimal.transformer';
import { CooperationTerm } from './cooperationTerm.entity';
import { CooperationTermItemHospitalQty } from './cooperationTermItemHospitalQty.entity';
import { CooperationTermInterest } from './cooperationTermInterest.entity';
import { CooperationTermAllocation } from './cooperationTermAllocation.entity';
import { CooperationTermSupplyMonth } from './cooperationTermSupplyMonth.entity';

@Entity('cooperation_term_item')
export class CooperationTermItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  termId: number;

  @ManyToOne(() => CooperationTerm, (term) => term.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'term_id' })
  term: CooperationTerm;

  @Column({ type: 'int', default: 0 })
  position: number;

  /** Número do item no edital. O termo firmado preserva essa numeração, inclusive com lacunas. */
  @Column({ type: 'int', nullable: true })
  itemNumber: number | null;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 30, default: 'KG' })
  unit: string;

  @Column({ type: 'decimal', precision: 16, scale: 3, default: 0, transformer: decimalTransformer })
  estimatedQuantity: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  unitPrice: number | null;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  totalPrice: number | null;

  @OneToMany(() => CooperationTermItemHospitalQty, (qty) => qty.item, { cascade: true })
  hospitalQuantities: CooperationTermItemHospitalQty[];

  @OneToMany(() => CooperationTermInterest, (interest) => interest.item, { cascade: true })
  interests: CooperationTermInterest[];

  @OneToMany(() => CooperationTermAllocation, (allocation) => allocation.item, { cascade: true })
  allocations: CooperationTermAllocation[];

  @OneToMany(() => CooperationTermSupplyMonth, (month) => month.item, { cascade: true })
  supplyMonths: CooperationTermSupplyMonth[];
}
