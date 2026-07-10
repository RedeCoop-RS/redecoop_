import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { City } from "../../city/entities/city.entity";

@Entity()
export class State {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 191, nullable: false })
    name: string;

    @Column({ length: 191, nullable: false })
    abbreviation: string;

    @OneToMany(() => City, city => city.state)
    cities: City[];
}