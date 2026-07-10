import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class ProductCategoryResponseDto {
    @ApiProperty()
    @Expose()
    id: number;
    @ApiProperty()
    @Expose()
    name: string;
}