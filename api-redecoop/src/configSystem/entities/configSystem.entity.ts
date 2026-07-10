import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ConfigSystem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('decimal', { precision: 5, scale: 2 })
    serviceTax: number;

    @Column('decimal', { precision: 5, scale: 2, default: 80 })
    minimumServiceTax: number;
}