import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CooperationTermItem } from './cooperationTermItem.entity';

@Entity('cooperation_term_supply_month')
@Unique(['itemId', 'cooperativeId'])
export class CooperationTermSupplyMonth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @ManyToOne(() => CooperationTermItem, (item) => item.supplyMonths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: CooperationTermItem;

  @Column()
  cooperativeId: number;

  @Column({ type: 'json' })
  months: number[];
}
