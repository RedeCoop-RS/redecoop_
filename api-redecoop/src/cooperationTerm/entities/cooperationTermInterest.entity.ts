import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { CooperationTermItem } from './cooperationTermItem.entity';

@Entity('cooperation_term_interest')
@Unique(['itemId', 'cooperativeId'])
export class CooperationTermInterest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  itemId: number;

  @ManyToOne(() => CooperationTermItem, (item) => item.interests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: CooperationTermItem;

  @Column()
  cooperativeId: number;

  @ManyToOne(() => Cooperative, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cooperative_id' })
  cooperative: Cooperative;
}
