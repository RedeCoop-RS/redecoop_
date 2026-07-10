import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { City } from "src/city/entities/city.entity";

export class StateDto {
    @ApiProperty()
    @Expose()
    id: number;
    @Expose()
    @ApiProperty()
    name: string;
    @ApiProperty()
    @Expose()
    abbreviation: string;
}