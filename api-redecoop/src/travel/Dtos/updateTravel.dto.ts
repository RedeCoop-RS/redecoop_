import { Type } from "class-transformer";
import { IsDateString, IsInt, IsISO8601, IsOptional, IsString, Matches, ValidateNested } from "class-validator";
import { CreateStopDto } from "./createTravel.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateTravelDto {
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  driverId: number;

  @ApiPropertyOptional()
  @IsISO8601()
  startDateTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateStopDto)
  stops: CreateStopDto[];
}
