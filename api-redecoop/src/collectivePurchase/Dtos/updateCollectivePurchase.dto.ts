import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCollectivePurchaseDto {
  @ApiProperty({
    example: 4320008,
    description: 'ID da cidade',
    required: false,
  })
  @IsNotEmpty()
  @IsInt()
  cityId?: number;

  @ApiProperty({
    example: 'Compra coletiva teste',
    description: 'Descrição',
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  description?: string;
  @ApiProperty({
    example: [{ productName: 'Banana terra', weight: 1000 }],
    required: false,
    description: 'Array de produtos',
    isArray: true,
  })
  @IsArray()
  @Type(() => UpdateCollectivePurchaseProductsDto)
  @ValidateNested({ each: true })
  products?: UpdateCollectivePurchaseProductsDto[];
}

export class UpdateCollectivePurchaseProductsDto {
  @IsNotEmpty()
  @IsString()
  productName?: string;

  @IsNotEmpty()
  @IsNumber()
  weight?: number;
}
