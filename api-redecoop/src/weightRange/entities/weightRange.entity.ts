import { ValueRange } from "@/valueRange/entities/valueRange.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";

@Entity()
export class WeightRange {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    from: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    to: number;

    @OneToMany(() => ValueRange, valueRange => valueRange.weightRange)
    valueRanges: ValueRange[];
}