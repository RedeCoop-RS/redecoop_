import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDateString,
  IsDecimal,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

class CreateCoordinatesDto {
  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;
}

export class CreateStopDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCoordinatesDto)
  coordinates: CreateCoordinatesDto;

  @ApiProperty()
  @IsNumber()
  load: number;

  @IsNumber()
  unload: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  order: number;
}

export class CreateTravelDto {
  @ApiPropertyOptional({ description: 'Usuario admin que define' })
  @IsOptional()
  @IsInt()
  cooperativeId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  vehicleId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  driverId: number;

  @ApiProperty()
  @IsISO8601()
  startDateTime: string;

  @ApiProperty({ isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStopDto)
  stops: CreateStopDto[];
}
