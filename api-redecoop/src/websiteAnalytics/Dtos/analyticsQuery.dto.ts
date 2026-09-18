import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class AnalyticsRangeDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AnalyticsHeatmapQueryDto extends AnalyticsRangeDto {
  @ApiPropertyOptional({ example: '/' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  path?: string;
}
