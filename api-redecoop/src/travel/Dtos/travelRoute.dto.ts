import { Expose, Transform, Type } from 'class-transformer';
import { TravelOfferDto } from '../../travelOffer/Dtos/travelOffer.dto';
import { TravelRouteProductDto } from './travelRouteProduct.dto';
import { ApiProperty } from '@nestjs/swagger';

export class TravelRouteDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  @Transform(({ value }) =>
    typeof value === 'number' && !isNaN(value) ? parseFloat(value.toFixed(2)) : undefined,
  )
  distance: number;

  @ApiProperty()
  @Expose()
  address: string;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  latitude: number;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  longitude: number;

  @ApiProperty()
  @Expose()
  order: number;

  @ApiProperty()
  @Expose()
  @Type(() => TravelOfferDto)
  offer?: TravelOfferDto[];

  @ApiProperty()
  @Expose()
  offerId: number;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  loadingWeight: number;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  unloadingWeight: number;

  @ApiProperty()
  @Expose()
  @Type(() => TravelRouteProductDto)
  routeProduct?: TravelRouteProductDto;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  remainingCapacity?: number;

  @ApiProperty()
  @Expose()
  arrivedAt: Date;

  @ApiProperty()
  @Expose()
  attachment: string;

  @ApiProperty()
  @Expose()
  coopAttachment: string;
}
