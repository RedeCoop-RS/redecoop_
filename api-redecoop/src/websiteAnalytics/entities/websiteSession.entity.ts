import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WebsiteDeviceType = 'desktop' | 'mobile' | 'tablet';

@Entity()
@Index(['visitorId'])
@Index(['startedAt'])
@Index(['lastSeenAt'])
export class WebsiteSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  visitorId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  @Column({ type: 'varchar', length: 16, default: 'desktop' })
  deviceType: WebsiteDeviceType;

  @Column({ type: 'varchar', length: 300, nullable: true })
  referrer?: string | null;

  @Column({ type: 'varchar', length: 180 })
  landingPath: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'int', nullable: true })
  viewportW?: number | null;

  @Column({ type: 'int', nullable: true })
  viewportH?: number | null;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime' })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
