import { Expose, Type } from 'class-transformer';
import { DistanceRangeDto } from '@/distanceRange/dtos/distanceRange.dto';
import { WeightRangeDto } from '@/weightRange/dtos/weightRange.dto';

export class ValueRangeDto {
  @Expose()
  id: number;

  @Expose()
  @Type(() => Number)
  value: number;

  @Expose()
  @Type(() => Number)
  distanceRangeId: number;

  @Expose()
  @Type(() => Number)
  weightRangeId: number;

  @Expose()
  @Type(() => DistanceRangeDto)
  distanceRange: DistanceRangeDto;

  @Expose()
  @Type(() => WeightRangeDto)
  weightRange: WeightRangeDto;
}
