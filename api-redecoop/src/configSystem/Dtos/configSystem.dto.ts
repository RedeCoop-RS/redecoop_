import { DistanceRangeDto } from '@/distanceRange/dtos/distanceRange.dto';
import { PackagingDto } from '@/packaging/Dtos/packaging.dto';
import { ProductCategoryResponseDto } from '@/productCategory/Dtos/productCategoryResponse.dto';
import { ProductTypeResponseDto } from '@/productType/Dtos/productTypeResponse.dto';
import { ValueRangeDto } from '@/valueRange/dtos/valueRange.dto';
import { CreateVehicleTypeDto } from '@/vehicleType/dtos/createVehicleType.dto';
import { VehicleTypeResponseDto } from '@/vehicleType/dtos/vehicleTypeResponse.dto';
import { WeightRangeDto } from '@/weightRange/dtos/weightRange.dto';
import { Expose, Transform, Type } from 'class-transformer';

export class ConfigSystemDto {
  @Expose()
  @Type(() => Number)
  serviceTax: number;

  @Expose()
  @Type(() => Number)
  minimumServiceTax: number;

  @Expose()
  @Type(() => ProductTypeResponseDto)
  loadTypes?: ProductTypeResponseDto[];

  @Expose()
  @Type(() => VehicleTypeResponseDto)
  vehicleTypes?: VehicleTypeResponseDto[];

  @Expose()
  @Type(() => ProductCategoryResponseDto)
  productCategories?: ProductCategoryResponseDto[];

  @Expose()
  @Type(() => PackagingDto)
  packaging?: PackagingDto[];

  @Expose()
  @Type(() => DistanceRangeDto)
  distanceRanges?: DistanceRangeDto[];

  @Expose()
  @Type(() => WeightRangeDto)
  weightRanges?: WeightRangeDto[];

  @Expose()
  @Type(() => ValueRangeDto)
  valueRanges?: ValueRangeDto[];
}
