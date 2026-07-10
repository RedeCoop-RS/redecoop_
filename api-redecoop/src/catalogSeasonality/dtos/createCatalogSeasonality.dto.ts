import { IsInt, Min, Max, IsEnum } from 'class-validator';
import { SeasonalityLevel } from '../entities/catalogSeasonality.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCatalogSeasonalityDto {
  @ApiProperty({
    example: 1,
    description: 'Mês em número',
    required: true,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    example: SeasonalityLevel.LOW,
    description: 'Nivel de sazonalidade no mês',
    required: true,
    enum: SeasonalityLevel,
  })
  @IsEnum(SeasonalityLevel)
  seasonality: SeasonalityLevel;
}
