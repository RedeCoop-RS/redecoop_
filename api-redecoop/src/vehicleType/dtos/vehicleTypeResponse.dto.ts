import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class VehicleTypeSummaryDto {
    @ApiProperty()
    @Expose()
    id: number;
    @ApiProperty()
    @Expose()
    name: string
}


export class VehicleTypeResponseDto {
    @ApiProperty()
    @Expose()
    id: number;
    @ApiProperty()
    @Expose()
    name: string;
    @ApiProperty()
    @Expose()
    @Type(() => Number)
    mpy: number;
}