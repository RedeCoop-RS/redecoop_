import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CooperationTermModel } from '../enums/cooperationTerm.enums';

export class CreateCooperationTermDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  processNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  buyerInstitution: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail()
  @MaxLength(191)
  buyerEmail?: string | null;

  @IsEnum(CooperationTermModel)
  model: CooperationTermModel;
}

export class UpdateCooperationTermDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  processNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  buyerInstitution?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail()
  @MaxLength(191)
  buyerEmail?: string | null;

  @IsOptional()
  @IsEnum(CooperationTermModel)
  model?: CooperationTermModel;
}

export class HospitalQuantityDto {
  @IsInt()
  hospitalUnitId: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;
}

export class CooperationTermItemDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  itemNumber?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  unit: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estimatedQuantity?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HospitalQuantityDto)
  hospitalQuantities?: HospitalQuantityDto[];
}

export class HospitalUnitInputDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name: string;
}

export class ReplaceHospitalUnitsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HospitalUnitInputDto)
  units: HospitalUnitInputDto[];
}

export class InterestItemDto {
  @IsInt()
  itemId: number;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  cooperativeIds: number[];
}

export class SetInterestsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterestItemDto)
  items: InterestItemDto[];
}

export class CapacityEntryDto {
  @IsInt()
  itemId: number;

  @IsInt()
  cooperativeId: number;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  maxCapacity: number | null;
}

export class SetCapacitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacityEntryDto)
  entries: CapacityEntryDto[];
}

export class CalendarEntryDto {
  @IsInt()
  itemId: number;

  @IsInt()
  cooperativeId: number;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  months: number[];
}

export class SetCalendarDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarEntryDto)
  entries: CalendarEntryDto[];
}

export class ReleaseDivisionDto {
  @IsBoolean()
  released: boolean;
}

export class SendCooperationTermDto {
  @IsBoolean()
  confirm: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}

export class SendDivisionDto {
  @IsBoolean()
  confirm: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}
