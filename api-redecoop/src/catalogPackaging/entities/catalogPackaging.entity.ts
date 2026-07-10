import { Packaging } from "@/packaging/entities/packaging.entity";
import { Catalog } from "../../catalog/entities/catalog.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum PackagingType {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY',
    ADDITIONAL = 'ADDITIONAL',
}

@Entity()
export class CatalogPackaging {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    packagingId: number;

    @Column('text')
    info: string;

    @Column('float')
    weight: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Catalog, catalog => catalog.packaging, { nullable: false })
    @JoinColumn()
    catalog: Catalog;

    @ManyToOne(() => Packaging, packagingType => packagingType.catalogPackages, { nullable: false })
    @JoinColumn()
    packaging: Packaging;

    @Column({ type: "enum", enum: PackagingType, nullable: false })
    type: PackagingType;

}