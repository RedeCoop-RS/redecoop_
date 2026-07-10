import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose, Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateProductCategoryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;
}
