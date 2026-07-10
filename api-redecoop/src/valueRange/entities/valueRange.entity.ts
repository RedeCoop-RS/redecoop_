import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { DistanceRange } from "@/distanceRange/entities/distanceRange.entity";
import { WeightRange } from "@/weightRange/entities/weightRange.entity";

@Entity()
export class ValueRange {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    value: number;

    @Column()
    distanceRangeId: number;

    @ManyToOne(() => DistanceRange, distanceRange => distanceRange.valueRanges)
    @JoinColumn({ name: "distanceRangeId" })
    distanceRange: DistanceRange;

    @Column()
    weightRangeId: number;

    @ManyToOne(() => WeightRange, weightRange => weightRange.valueRanges)
    @JoinColumn({ name: "weightRangeId" })
    weightRange: WeightRange;
}