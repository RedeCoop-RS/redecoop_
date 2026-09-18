import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
@Index(['path', 'createdAt'])
@Index(['sessionId'])
@Index(['visitorId', 'createdAt'])
@Index(['createdAt'])
export class WebsitePageView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  visitorId: string;

  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  @Column({ type: 'varchar', length: 180 })
  path: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  title?: string | null;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  maxScrollPct: number;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
