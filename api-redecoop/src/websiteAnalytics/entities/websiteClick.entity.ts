import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Index(['path', 'createdAt'])
@Index(['createdAt'])
export class WebsiteClick {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  visitorId: string;

  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  @Column({ type: 'varchar', length: 180 })
  path: string;

  @Column({ type: 'tinyint', unsigned: true })
  xPct: number;

  @Column({ type: 'tinyint', unsigned: true })
  yPct: number;

  @CreateDateColumn()
  createdAt: Date;
}
