import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BusinessStatus, BusinessType } from '../entities/business.entity';
import { CooperativeSummaryDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { ConversationDto } from '@/conversation/Dtos/conversation.dto';
import { TravelOfferDto } from '@/travelOffer/Dtos/travelOffer.dto';
import { BusinessDeskDto } from '@/businessDesk/Dtos/businessDesk.dto';
import { CollectivePruchaseDto } from '@/collectivePurchase/Dtos/collectivePurchase.dto';

export class BusinessDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  @Type(() => Number)
  fee: number;

  @ApiProperty()
  @Expose()
  status: BusinessStatus;

  @ApiProperty()
  @Expose()
  type: BusinessType;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  offeringCooperative: CooperativeSummaryDto;

  @ApiProperty()
  @Expose()
  offeringCooperativeId: number;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  requestingCooperative: CooperativeSummaryDto;

  @ApiProperty()
  @Expose()
  requestingCooperativeId: number;

  @ApiProperty({ type: () => TravelOfferDto })
  @Expose()
  @Type(() => TravelOfferDto)
  travelOffer?: TravelOfferDto;

  @ApiProperty()
  @Expose()
  @Type(() => ConversationDto)
  conversation: ConversationDto;

  @ApiProperty()
  @Expose()
  @Type(() => BusinessDeskDto)
  businessDesk: BusinessDeskDto;

  @ApiProperty()
  @Expose()
  @Type(() => CollectivePruchaseDto)
  collectivePurchase: CollectivePruchaseDto;
}
