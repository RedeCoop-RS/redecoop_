import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsEnum, IsDate, IsOptional, IsInt } from 'class-validator';
import { CNHCategory, BloodType } from '../entities/driver.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEnum(CNHCategory)
  cnhCategory: CNHCategory;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  numberCnh: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cpf: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEnum(BloodType)
  bloodType: BloodType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  securityContact: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  dateBirth: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Foto do motorista',
    format: 'binary',
  })
  @IsOptional()
  img?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  cooperativeId?: number;
}
