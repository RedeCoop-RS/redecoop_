import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum ReportTypes {
  PRODUCTS_COOPERATIVE = 'PRODUCTS_COOPERATIVE',
  TRAVELS_MADE_COOPERATIVE = 'TRAVELS_MADE_COOPERATIVE',
  PRODUCTS_TRANSPORTED_BY_COOPERATIVE = 'PRODUCTS_TRANSPORTED_BY_COOPERATIVE',
  TRAVELS_PRICE_FINISHED = 'TRAVELS_PRICE_FINISHED'
}

export enum ReportFilters {
  COOPERATIVEID = 'COOPERATIVEID',
  PRODUCTCATEGORYID = 'PRODUCTCATEGORYID',
  PERIOD = 'PERIOD'
}

export class ReportDto {
  @ApiProperty()
  @IsEnum(ReportTypes)
  type:ReportTypes;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cooperativeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  productCategoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?:string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?:string
}
