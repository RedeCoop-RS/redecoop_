import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsNumber } from 'class-validator';

export class DistanceQueryDto {
  @ApiProperty({
    description: 'Latitude inicial',
    example: -23.55052,
  })
  @IsLatitude()
  startLat: number;

  @ApiProperty({
    description: 'Longitude inicial',
    example: -46.633308,
  })
  @IsLongitude()
  startLng: number;

  @ApiProperty({
    description: 'Latitude final',
    example: -22.906847,
  })
  @IsLatitude()
  endLat: number;

  @ApiProperty({
    description: 'Longitude final',
    example: -43.172896,
  })
  @IsLongitude()
  endLng: number;
}
