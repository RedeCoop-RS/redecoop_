import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  productTypeId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  productCategoryId: number;

  @ApiProperty({
    type: 'string',
    description: 'Foto do Produto',
    format: 'binary',
  })
  img: Express.Multer.File;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  productTypeId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  productCategoryId: number;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Foto do Produto',
    format: 'binary',
  })
  @IsOptional()
  img?: Express.Multer.File;
}
