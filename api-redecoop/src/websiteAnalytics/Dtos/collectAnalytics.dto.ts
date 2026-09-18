import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnalyticsEventDto {
  @ApiProperty({ enum: ['session', 'pageview', 'heartbeat', 'click'] })
  @IsIn(['session', 'pageview', 'heartbeat', 'click'])
  type: 'session' | 'pageview' | 'heartbeat' | 'click';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  userAgent?: string;

  @ApiPropertyOptional({ enum: ['desktop', 'mobile', 'tablet'] })
  @IsOptional()
  @IsIn(['desktop', 'mobile', 'tablet'])
  deviceType?: 'desktop' | 'mobile' | 'tablet';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  viewportW?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  viewportH?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3_600_000)
  durationMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxScrollPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  xPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  yPct?: number;
}

export class CollectAnalyticsDto {
  @ApiProperty()
  @IsUUID('4')
  visitorId: string;

  @ApiProperty()
  @IsUUID('4')
  sessionId: string;

  @ApiProperty({ type: [AnalyticsEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events: AnalyticsEventDto[];
}
