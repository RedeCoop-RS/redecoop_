import { Catalog } from '../../catalog/entities/catalog.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';


export enum SeasonalityLevel {
    NONE = 'NONE',
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}


@Entity()
export class CatalogSeasonality {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    catalogId: number;

    @Column()
    month: number;

    @Column({
        type: 'enum',
        enum: SeasonalityLevel,
        default: SeasonalityLevel.NONE
    })
    seasonality: SeasonalityLevel;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Catalog, catalog => catalog.seasonalities, { nullable: false })
    @JoinColumn({ name: 'catalog_id' })
    catalog: Catalog;
}