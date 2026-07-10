import { Expose, Type } from 'class-transformer';
import { ProductDto } from '@/product/Dtos/product.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TravelRouteProductDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  @Type(() => ProductDto)
  product?: ProductDto;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  loadedWeight: number;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  unloadedWeight: number;
}
