import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class CreateCollectivePurchaseDto {
  @ApiProperty({
    example: 4320008,
    required: true,
    description: 'ID da cidade',
  })
  @IsNotEmpty()
  @IsInt()
  cityId: number;

  @ApiProperty({
    example: 'Compra coletiva descrição',
    required: true,
    description: 'Descrição sobre a compra coletiva',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: [{ productName: 'Banana terra', weight: 1000 }],
    required: true,
    description: 'Array de produtos',
    isArray: true,
  })
  @IsArray()
  @Type(() => CollectivePurchaseProductsDto)
  @ValidateNested({ each: true })
  products: CollectivePurchaseProductsDto[];
}

export class CollectivePurchaseProductsDto {
  @ApiProperty({
    example: 'Banana Terra',
    required: true,
    description: 'Nome do Produto',
  })
  @IsString()
  productName: string;
  @ApiProperty({
    example: 1000,
    required: true,
    description: 'Peso do produto',
  })
  @IsNumber()
  weight: number;
}
