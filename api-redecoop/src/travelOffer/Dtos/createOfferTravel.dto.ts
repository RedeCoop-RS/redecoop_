import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsObject,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsArray,
  IsPositive,
} from 'class-validator';

class CoordinatesOfferDto {
  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;
}

export class ProductsOfferTravelDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  weight: number;
}

export class StopOfferDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ type: 'object' })
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesOfferDto)
  coordinates: CoordinatesOfferDto;

  @ApiProperty({ isArray: true })
  @IsArray()
  @ValidateNested()
  @Type(() => ProductsOfferTravelDto)
  productsLoad: ProductsOfferTravelDto[];

  
  @ApiProperty({ isArray: true })
  @IsArray()
  @ValidateNested()
  @Type(() => ProductsOfferTravelDto)
  productsUnload: ProductsOfferTravelDto[];

  
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  order: number;
}

export class CreateTravelOfferDto {
  @ValidateNested({ each: true })
  @Type(() => StopOfferDto)
  stops: StopOfferDto[];

  @IsInt()
  @IsNotEmpty()
  travelId: number;

  @IsOptional()
  @IsString()
  initialMessage?: string;
}
