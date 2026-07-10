import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class FinalizeTravelDto {
  @ApiProperty({ example: '2026-03-22T00:00:00.000Z' })
  @IsISO8601()
  completedAt: string;
}
