import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { State } from "../../state/entities/state.entity";
import { Cooperative } from "../../cooperative/entities/cooperative.entity";
import { Visitant } from "../../visitant/entities/visitant.entity";
import { CollectivePurchase } from "../../collectivePurchase/entities/collectivePurchase.entity";
import { CooperativeDeliveryCity } from "@/cooperative/entities/cooperative-delivery-city.entity";

@Entity()
export class City {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 191 })
    name: string;

    @Column()
    stateId: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;
  
    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ nullable: true, default: null })
    corede: string;

    @Column({ nullable: true, default: null })
    functional_region: string;

    @ManyToOne(() => State, state => state.cities)
    @JoinColumn()
    state: State;

    @OneToMany(() => Cooperative, cooperative => cooperative.city)
    cooperatives: Cooperative[];

    @OneToMany(() => Visitant, visitant => visitant.city)
    visitants: Visitant[];

    @OneToMany(() => CollectivePurchase, collectivePurchase => collectivePurchase.city)
    collectivePurchases: CollectivePurchase[];

    @OneToMany(() => CooperativeDeliveryCity, deliveryCity => deliveryCity.city)
    cooperativeDeliveries: CooperativeDeliveryCity[];
}