import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateCatalogPackagingDto {
  @ApiProperty({
    example: 'Embalagem 1',
    description: 'Informações do produto',
    required: true,
  })
  @IsString()
  info: string;

  @ApiProperty({
    example: 1000,
    description: 'Peso do Produto',
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  weight: number;

  @ApiProperty({
    example: 1,
    description: 'ID da Embalagem',
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  packagingId: number;
}
