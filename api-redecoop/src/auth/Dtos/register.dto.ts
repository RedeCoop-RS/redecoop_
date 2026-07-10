import { VisitantType } from '@/visitant/entities/visitant.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPostalCode,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
export class registerVisitantDto {
  @ApiProperty({
    example: 'visitant@email.com',
    required: true,
  })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    example: '123456',
    required: true,
  })
  @MinLength(6)
  @MaxLength(20)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Senha muito fraca, deve conter números, letras e simbolos',
  })
  password: string;

  @ApiProperty({
    example: 'Cooperativa CoopBrasil',
    required: true,
  })
  @IsString()
  @MinLength(4)
  name: string;

  @ApiProperty({
    example: '51991777765',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'Av. Praia de Belas',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: '90110000',
    required: true,
  })
  @IsNotEmpty()
  cep: string;

  @ApiProperty({
    example: '123',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({
    example: 4314902,
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  cityId: number;

  @ApiProperty({
    example: 'Cidade Baixa',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({
    enum: VisitantType,
  })
  @IsEnum(VisitantType)
  @IsNotEmpty()
  type: VisitantType;
}
