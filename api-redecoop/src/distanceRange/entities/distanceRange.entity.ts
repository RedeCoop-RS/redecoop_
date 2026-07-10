import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { ValueRange } from "@/valueRange/entities/valueRange.entity";

@Entity()
export class DistanceRange {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    from: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    to: number;

    @OneToMany(() => ValueRange, valueRange => valueRange.distanceRange)
    valueRanges: ValueRange[];
}