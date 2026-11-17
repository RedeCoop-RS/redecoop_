import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../domain/decimal.transformer';
import { CooperationTermItem } from './cooperationTermItem.entity';
import { CooperationTermHospitalUnit } from './cooperationTermHospitalUnit.entity';

@Entity('cooperation_term_item_hospital_qty')
export class CooperationTermItemHospitalQty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @ManyToOne(() => CooperationTermItem, (item) => item.hospitalQuantities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: CooperationTermItem;

  @Column()
  hospitalUnitId: number;

  @ManyToOne(() => CooperationTermHospitalUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospital_unit_id' })
  hospitalUnit: CooperationTermHospitalUnit;

  @Column({ type: 'decimal', precision: 16, scale: 3, default: 0, transformer: decimalTransformer })
  quantity: number;
}
