import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsEmail,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CooperativeType } from '../enums/cooperativeType.enum';
import { Transform } from 'class-transformer';

export class UpdateCooperativeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fantasyName: string;

  @ApiProperty()
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  emailLogin: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Logo Cooperativa',
    format: 'binary',
  })
  @IsOptional()
  img: Express.Multer.File;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  cityId: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  cnpj: string;

  @ApiProperty()
  @IsString()
  website: string;

  @ApiProperty()
  @IsString()
  instagram: string;

  @ApiProperty()
  @IsString()
  facebook: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  cep: string;

  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty()
  @IsString()
  neighborhood: string;

  @ApiProperty()
  @IsString()
  complement: string;

  @ApiProperty()
  @IsNumber()
  maleAssociates: number;

  @ApiProperty()
  @IsNumber()
  femaleAssociates: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  youngAssociates: number;

  @ApiProperty({ enum: CooperativeType })
  @IsEnum(CooperativeType)
  type: CooperativeType;

  @ApiProperty()
  @IsString()
  DAP: string;

  @ApiPropertyOptional({ type: [Number], items: { type: 'integer' } })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.length > 0) return value.split(',').map(Number);
    if (Array.isArray(value)) return value.map(Number);
    return [];
  })
  readonly serviceCityIds: number[];
}
