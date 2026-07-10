import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import { CatalogPackaging } from '../../catalogPackaging/entities/catalogPackaging.entity';
import { CatalogSeasonality } from '../../catalogSeasonality/entities/catalogSeasonality.entity';
import { Product } from '../../product/entities/product.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  DeleteDateColumn,
} from 'typeorm';

@Entity()
export class Catalog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cooperativeId: number;

  @Column()
  productId: number;

  /** Foto específica da cooperativa para este item do catálogo (evita conflito de marca). */
  @Column({ name: 'custom_image', type: 'varchar', length: 255, nullable: true })
  customImage: string | null;

  @Column({ default: false })
  hasSeasonality: boolean;

  @Column('float', { nullable: true })
  highEstimate?: number;

  @Column('float', { nullable: true })
  mediumEstimate?: number;

  @Column('float', { nullable: true })
  lowEstimate?: number;

  @Column({ default: false })
  hasPrimaryPackaging: boolean;

  @Column({ default: false })
  hasSecondaryPackaging: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Cooperative, (cooperative) => cooperative.catalogs, { nullable: false })
  @JoinColumn()
  cooperative: Cooperative;

  @ManyToOne(() => Product, (product) => product.catalogs, { nullable: false })
  @JoinColumn()
  product: Product;

  @OneToMany(() => CatalogPackaging, (packaging) => packaging.catalog)
  packaging: CatalogPackaging[];

  @OneToMany(() => CatalogSeasonality, (seasonality) => seasonality.catalog)
  seasonalities: CatalogSeasonality[];
}
