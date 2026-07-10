import { CreateBusinessDeskProductDto } from '@/businessDeskProduct/Dtos/createBusinessDeskProduct.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsArray, ValidateNested, IsInt } from 'class-validator';

export class CreateBusinessDeskDto {
  @ApiProperty({
    example: 'Descrição balcão de negocio',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    required: true,
    isArray: true,
    type: CreateBusinessDeskProductDto
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBusinessDeskProductDto)
  catalogProducts: CreateBusinessDeskProductDto[];
}
