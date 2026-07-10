import { Expose, Type } from 'class-transformer';
import { ValueRangeDto } from '@/valueRange/dtos/valueRange.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class WeightRangeDto {
  @Expose()
  id: number;

  @Expose()
  @Type(() => Number)
  @ApiProperty({ example: 0, description: 'Distância inicial' })
  @IsNotEmpty()
  @IsNumber()
  from: number;
  
  @Expose()
  @Type(() => Number)
  @ApiProperty({ example: 10, description: 'Distância final' })
  @IsNotEmpty()
  @IsNumber()
  to: number;

  @Expose()
  @Type(() => ValueRangeDto)
  valueRanges?: ValueRangeDto[];
}
