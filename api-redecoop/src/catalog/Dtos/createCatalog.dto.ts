import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateCatalogSeasonalityDto } from '@/catalogSeasonality/dtos/createCatalogSeasonality.dto';
import { CreateCatalogPackagingDto } from '@/catalogPackaging/dtos/createCatalogPackaging.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCatalogDto {
  @ApiProperty({
    example: 12,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @ApiPropertyOptional({
    description:
      'Nome do ficheiro da imagem enviada (POST cooperative/catalog/custom-image). Opcional.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? undefined : value))
  @IsString()
  customImage?: string;

  @ApiProperty({
    example: false,
    description: 'Indica se o produto tem sazonalidade',
    required: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  hasSeasonality: boolean;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Períodos de sazonalidade se hasSeasonality for true',
    type: CreateCatalogSeasonalityDto,
  })
  @ValidateIf((o) => o.hasSeasonality)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogSeasonalityDto)
  seasonality: CreateCatalogSeasonalityDto[];

  @ApiPropertyOptional({
    example: 1000,
    description: 'Estimativa alta para o produto se hasSeasonality for true',
  })
  @ValidateIf((o) => o.hasSeasonality)
  @IsNumber()
  highEstimate: number;

  @ApiPropertyOptional({
    example: 750,
    description: 'Estimativa média para o produto se hasSeasonality for true',
  })
  @ValidateIf((o) => o.hasSeasonality)
  @IsNumber()
  mediumEstimate: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Estimativa baixa para o produto se hasSeasonality for true',
  })
  @ValidateIf((o) => o.hasSeasonality)
  @IsNumber()
  lowEstimate: number;

  @ApiProperty({
    example: true,
    description: 'Indica se o produto possui embalagem primária',
    required: true,
  })
  @IsBoolean()
  hasPrimaryPackaging: boolean;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Detalhes da embalagem Primária se hasPrimaryPackaging for true',
    type: CreateCatalogPackagingDto,
  })
  @ValidateIf((o) => o.primaryPackaging)
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogPackagingDto)
  primaryPackagingDetails: CreateCatalogPackagingDto;

  @ApiProperty({
    example: false,
    description: 'Indica se o produto possui embalagem secundária',
    required: true,
  })
  @IsBoolean()
  hasSecondaryPackaging: boolean;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Detalhes da embalagem secundária se hasSecondaryPackaging for true',
    type: CreateCatalogPackagingDto,
  })
  @ValidateIf((o) => o.hasSecondaryPackaging)
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogPackagingDto)
  secondaryPackagingDetails: CreateCatalogPackagingDto;
}
