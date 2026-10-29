import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('ghost_connection')
export class GhostConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 500 })
  adminUrl: string;

  /** AES-256-GCM. Nunca devolver este campo na API. */
  @Column({ type: 'text', nullable: true })
  apiKeyCipher: string | null;

  @Column({ length: 16, nullable: true })
  keyHint: string | null;

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
