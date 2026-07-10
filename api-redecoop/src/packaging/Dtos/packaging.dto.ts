import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class PackagingDto {
    @ApiProperty()
    @Expose()
    id: number;
    @Expose()
    @ApiProperty()
    name: string;
}