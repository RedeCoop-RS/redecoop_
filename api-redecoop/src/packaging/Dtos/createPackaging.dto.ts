import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class CreatePackagingTypeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;
}

