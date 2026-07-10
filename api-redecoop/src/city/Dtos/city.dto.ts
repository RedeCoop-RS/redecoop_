import { StateDto } from "@/state/Dtos/state.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform, Type } from "class-transformer";


export class CityDto {
    @ApiProperty()
    @Expose()
    id: number;
    @ApiProperty()
    @Expose()
    name: string;
    @ApiProperty()
    @Expose()
    stateId: number;
    @ApiProperty()
    @Expose()
    latitude: number;
    @ApiProperty()
    @Expose()
    longitude: number;
    @ApiProperty()
    @Expose()
    @Type(() => StateDto)
    state?: StateDto;
    @ApiProperty()
    @Expose()
    corede?: string;
    @ApiProperty()
    @Expose()
    functional_region?: string;
}
