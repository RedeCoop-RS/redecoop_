import { ProductCategoryResponseDto } from '@/productCategory/Dtos/productCategoryResponse.dto';
import { ProductTypeResponseDto } from '@/productType/Dtos/productTypeResponse.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class PublicCatalogSeasonalityDto {
  @ApiProperty()
  @Expose()
  month: number;

  @ApiProperty()
  @Expose()
  seasonality: string;
}

export class PublicCatalogProductDto {
  @ApiProperty()
  @Expose()
  catalogId: number;

  @ApiProperty()
  @Expose()
  cooperativeId: number;

  @ApiProperty()
  @Expose()
  cooperativeDisplayName: string;

  @ApiProperty()
  @Expose()
  productId: number;

  @ApiProperty()
  @Expose()
  productName: string;

  @ApiProperty()
  @Expose()
  img: string;

  @Expose()
  @Type(() => ProductCategoryResponseDto)
  productCategory?: ProductCategoryResponseDto;

  @Expose()
  @Type(() => ProductTypeResponseDto)
  productType?: ProductTypeResponseDto;

  @ApiProperty()
  @Expose()
  productCategoryId: number;

  @ApiProperty()
  @Expose()
  productTypeId: number;

  @ApiProperty()
  @Expose()
  hasSeasonality: boolean;

  @ApiProperty({ required: false })
  @Expose()
  highEstimate?: number;

  @ApiProperty({ required: false })
  @Expose()
  mediumEstimate?: number;

  @ApiProperty({ required: false })
  @Expose()
  lowEstimate?: number;

  @ApiProperty({ type: [PublicCatalogSeasonalityDto] })
  @Expose()
  @Type(() => PublicCatalogSeasonalityDto)
  seasonalities: PublicCatalogSeasonalityDto[];
}
