import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";


export class ProductTypeSummaryDto { 
    @ApiProperty()
    @Expose()
    id: number;
    @ApiProperty()
    @Expose()
    name: string;
}

export class ProductTypeResponseDto {
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