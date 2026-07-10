import { CatalogPackaging } from '../../catalogPackaging/entities/catalogPackaging.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';


@Entity()
export class Packaging {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany(() => CatalogPackaging, catalogPackage => catalogPackage.packaging)
    catalogPackages: CatalogPackaging[]


}