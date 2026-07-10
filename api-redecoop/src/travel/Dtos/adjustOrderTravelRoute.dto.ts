import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class AdjustRouteOrder {
  @ApiProperty()
  @IsNumber()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  order?: number;
}
