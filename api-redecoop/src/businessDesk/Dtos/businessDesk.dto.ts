import { Expose, Type } from 'class-transformer';

import { CooperativeDto, CooperativeSummaryDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { BusinessDeskProductDto } from '@/businessDeskProduct/Dtos/businessDeskProduct.dto';
import { ApiProperty } from '@nestjs/swagger';

export class BusinessDeskDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  description: string;

  @ApiProperty()
  @Expose()
  active: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  deletedAt: Date | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  cooperative?: CooperativeSummaryDto;

  @ApiProperty()
  @Expose()
  cooperativeId: number;

  @ApiProperty()
  @Expose()
  @Type(() => BusinessDeskProductDto)
  businessDeskProducts?: BusinessDeskProductDto[];
}
