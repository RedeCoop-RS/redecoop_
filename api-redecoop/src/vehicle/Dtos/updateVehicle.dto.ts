import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ToBoolean } from '@/_common/decorators/transformBoolean.decorator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  typeId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @IsNumber()
  volume: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  maximumWeight: number;

  @ApiPropertyOptional()
  @IsOptional()
  img: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  active: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cooperativeId: number;
}
