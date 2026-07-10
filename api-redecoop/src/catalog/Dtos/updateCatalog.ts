import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateCatalogPackagingDto } from '@/catalogPackaging/dtos/createCatalogPackaging.dto';
import { CreateCatalogSeasonalityDto } from '@/catalogSeasonality/dtos/createCatalogSeasonality.dto';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCatalogDto {
  @ApiPropertyOptional({
    description:
      'Imagem específica da cooperativa (filename após upload). Envie string vazia para voltar à imagem padrão do produto.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  customImage?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se o produto tem sazonalidade',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsBoolean()
  hasSeasonality: boolean;

  @ApiPropertyOptional({
    type: CreateCatalogSeasonalityDto,
    isArray: true,
    description: 'Períodos de sazonalidade se hasSeasonality for true',
  })
  @IsOptional()
  @ValidateIf((o) => o.hasSeasonality)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogSeasonalityDto)
  seasonality: CreateCatalogSeasonalityDto[];

  @ApiPropertyOptional({
    example: 1000,
    description: 'Estimativa alta para o produto se hasSeasonality for true',
  })
  @IsOptional()
  @ValidateIf((o) => o.hasSeasonality)
  @IsNumber()
  highEstimate: number;

  @ApiPropertyOptional({
    example: 750,
    description: 'Estimativa média para o produto se hasSeasonality for true',
  })
  @IsOptional()
  @ValidateIf((o) => o.hasSeasonality)
  @IsNumber()
  mediumEstimate: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Estimativa baixa para o produto se hasSeasonality for true',
  })
  @IsOptional()
  @ValidateIf((o) => o.hasSeasonality)
  @IsNumber()
  lowEstimate: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o produto possui embalagem primária',
  })
  @IsOptional()
  @IsBoolean()
  hasPrimaryPackaging: boolean;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Detalhes da embalagem Primária se hasPrimaryPackaging for true',
    type: CreateCatalogPackagingDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.primaryPackaging)
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogPackagingDto)
  primaryPackagingDetails: CreateCatalogPackagingDto;


  @ApiPropertyOptional({
    example: false,
    description: 'Indica se o produto possui embalagem secundária',
    required: true,
  })
  @IsOptional()
  @IsBoolean()
  hasSecondaryPackaging: boolean;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Detalhes da embalagem secundária se hasSecondaryPackaging for true',
    type: CreateCatalogPackagingDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.hasSecondaryPackaging)
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CreateCatalogPackagingDto)
  secondaryPackagingDetails: CreateCatalogPackagingDto;
}
