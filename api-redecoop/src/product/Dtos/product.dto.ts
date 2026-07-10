import { ProductCategoryResponseDto } from '@/productCategory/Dtos/productCategoryResponse.dto';
import { ProductTypeResponseDto } from '@/productType/Dtos/productTypeResponse.dto';
import { Expose, Type } from 'class-transformer';

export class ProductDto {
  @Expose()
  id: number;
  @Expose()
  name: string;
  @Expose()
  img: string;
  @Expose()
  @Type(() => ProductCategoryResponseDto)
  productCategory?: ProductCategoryResponseDto;
  @Expose()
  @Type(() => ProductTypeResponseDto)
  productType?: ProductTypeResponseDto;

  @Expose()
  productCategoryId: number;
  @Expose()
  productTypeId: number;
}
