import { BloodType, CNHCategory } from "../entities/driver.entity";
import { Expose, Type } from "class-transformer";
import { CooperativeSummaryDto } from "@/cooperative/Dtos/cooperativeResponse.dto";
import { UserDto } from "@/User/Dtos/user.dto";
import { ApiProperty } from "@nestjs/swagger";


export class DriverResponseDto {
    @ApiProperty()
    @Expose()
    id: number;
    @ApiProperty()
    @Expose()
    cooperativeId: number;
    @ApiProperty()
    @Expose()
    userId: number;
    @ApiProperty()
    @Expose()
    name: string;
    @ApiProperty()
    @Expose()
    phone: string;
    @ApiProperty()
    @Expose()
    cpf: string;
    @ApiProperty()
    @Expose()
    cnhCategory: CNHCategory;
    @ApiProperty()
    @Expose()
    numberCnh: string;
    @ApiProperty()
    @Expose()
    bloodType: BloodType;
    @ApiProperty()
    @Expose()
    securityContact: string;
    @ApiProperty()
    @Expose()
    dateBirth: Date;
    @ApiProperty()
    @Expose()
    img?: string;
    @ApiProperty()
    @Expose()
    active: boolean;
    @ApiProperty()
    @Expose()
    createdAt: Date;
    @ApiProperty()
    @Expose()
    updatedAt: Date;
    @ApiProperty()
    @Expose()
    @Type(() => CooperativeSummaryDto)
    cooperative?: CooperativeSummaryDto;
    @ApiProperty()
    @Expose()
    @Type(() => UserDto)
    user?: UserDto

}