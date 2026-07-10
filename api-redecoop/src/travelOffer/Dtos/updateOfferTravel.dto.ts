import { IsInt, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { StopOfferDto } from './createOfferTravel.dto';
import { Type } from 'class-transformer';

export class UpdateOfferTravelDto {
  @ValidateNested({ each: true })
  @Type(() => UpdateStopOfferDto)
  stops: UpdateStopOfferDto[];
}

export class UpdateStopOfferDto extends StopOfferDto {
  @IsOptional()
  @IsInt()
  routeId: number;
}
