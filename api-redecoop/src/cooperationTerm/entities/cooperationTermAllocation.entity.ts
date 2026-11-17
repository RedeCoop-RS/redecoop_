import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { decimalTransformer } from '../domain/decimal.transformer';
import { CooperationTermItem } from './cooperationTermItem.entity';

@Entity('cooperation_term_allocation')
@Unique(['itemId', 'cooperativeId'])
export class CooperationTermAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @ManyToOne(() => CooperationTermItem, (item) => item.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: CooperationTermItem;

  @Column()
  cooperativeId: number;

  @ManyToOne(() => Cooperative, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;

  @Column({ type: 'decimal', precision: 16, scale: 3, default: 0, transformer: decimalTransformer })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 3,
    nullable: true,
    transformer: decimalTransformer,
  })
  maxCapacity: number | null;
}
