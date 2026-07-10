import { CreateBusinessDeskProductDto } from '@/businessDeskProduct/Dtos/createBusinessDeskProduct.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdateBusinessDeskDto {
  @ApiProperty({
    example: 'Descrição balcão de negocio',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    required: false,
    isArray: true,
    type: CreateBusinessDeskProductDto,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBusinessDeskProductDto)
  catalogProducts: CreateBusinessDeskProductDto[];

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  active: boolean;
}
