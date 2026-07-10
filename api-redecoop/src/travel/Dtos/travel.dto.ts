import { CooperativeDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { VehicleResponseDto } from '@/vehicle/Dtos/vehicleRespose.dto';
import { Expose, Type } from 'class-transformer';
import { TravelStatus } from '../entities/travel.entity';
import { DriverResponseDto } from '@/driver/Dtos/driverResponse.dto';
import { TravelOfferDto } from '../../travelOffer/Dtos/travelOffer.dto';
import { TravelRouteDto } from './travelRoute.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessDto } from '@/business/Dtos/business.dto';

export class TravelDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  @Type(() => VehicleResponseDto)
  vehicle?: VehicleResponseDto;

  @ApiProperty()
  @Expose()
  vehicleId:number;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeDto)
  cooperative?: CooperativeDto;

  @ApiProperty()
  @Expose()
  cooperativeId:number;

  @ApiProperty()
  @Expose()
  @Type(() => DriverResponseDto)
  driver?: DriverResponseDto;

  @ApiProperty()
  @Expose()
  driverId:number;

  @ApiProperty()
  @Expose()
  @Type(() => TravelRouteDto)
  travelRoutes?: TravelRouteDto[];

  @ApiProperty()
  @Expose()
  @Type(() => TravelOfferDto)
  offers?: TravelOfferDto[];

  @ApiProperty()
  @Expose()
  startDateTime: Date;

  @ApiProperty()
  @Expose()
  status: TravelStatus;

  @ApiPropertyOptional()
  @Expose()
  completedAt?: Date;

  @ApiProperty()
  @Expose()
  offerCount?: number;

  @ApiProperty()
  @Expose()
  isOffer?: boolean;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  totalDistance?: number;

  @ApiPropertyOptional({
    description:
      'Pode iniciar: sem ofertas pendentes (todas confirmadas ou recusadas, ou sem ofertas). Não depende da data.',
  })
  @Expose()
  readyToStart?: boolean;
}
