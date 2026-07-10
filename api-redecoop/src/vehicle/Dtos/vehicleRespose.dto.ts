import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { CooperativeSummaryDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { VehicleTypeSummaryDto } from '../../vehicleType/dtos/vehicleTypeResponse.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty()
  @Expose()
  id: number;
  @ApiProperty()
  @Expose()
  cooperativeId: number;
  @ApiProperty()
  @Expose()
  licensePlate: string;
  @ApiProperty()
  @Expose()
  model: string;
  @ApiProperty()
  @Expose()
  typeId: number;
  @ApiProperty()
  @Expose()
  img: string;
  @ApiProperty()
  @Expose()
  active: boolean;
  @ApiProperty()
  @Expose()
  volume: number;
  @ApiProperty()
  @Expose()
  maximumWeight: number;
  @ApiProperty()
  @Expose()
  createdAt: Date;
  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  cooperative: CooperativeSummaryDto;

  @ApiProperty()
  @Expose()
  @Type(() => VehicleTypeSummaryDto)
  type: VehicleTypeSummaryDto;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Number)
  travelsFinishedCount: number;
}
