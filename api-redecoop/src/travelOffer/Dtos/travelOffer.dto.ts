import { CooperativeDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { Expose, Type } from 'class-transformer';
import { ChangeLog, OfferStatus } from '../entities/travelOffer.entity';
import { ApiProperty } from '@nestjs/swagger';
import { TravelDto } from '../../travel/Dtos/travel.dto';
import { TravelRouteDto } from '../../travel/Dtos/travelRoute.dto';
import { BusinessDto } from '@/business/Dtos/business.dto';

export class TravelOfferDto {
  @ApiProperty()
  @Expose()
  id: number;
  @ApiProperty()
  @Expose()
  @Type(() => CooperativeDto)
  cooperative?: CooperativeDto;
  @ApiProperty()
  @Expose()
  cooperativeId: number;
  @ApiProperty()
  @Expose()
  status: OfferStatus;
  @ApiProperty()
  @Expose()
  @Type(() => Number)
  totalDistance?: number;
  @ApiProperty()
  @Expose()
  @Type(() => TravelDto)
  travel: TravelDto;
  @ApiProperty()
  @Expose()
  @Type(() => BusinessDto)
  business: BusinessDto;
  @ApiProperty()
  @Expose()
  @Type(() => TravelRouteDto)
  routes: TravelRouteDto;
  @ApiProperty()
  @Expose()
  changelogs: ChangeLog[];
}
