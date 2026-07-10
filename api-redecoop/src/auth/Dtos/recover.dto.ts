import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RecoverEmailDto {
  @ApiProperty({
    example: 'cooperativa@email.com',
    required: true,
  })
  @IsEmail(undefined, { message: 'E-mail inválido' })
  @IsString()
  email: string;
}

export class RecoverEmailWithCode extends RecoverEmailDto {
  @ApiProperty({
    example: '123456-789123-233456-123213',
    required: true,
  })
  @IsString()
  code: string;
}

export class RecoverEmailWithCodeAndPassword extends RecoverEmailWithCode {
  @ApiProperty({
    example: '123456',
    required: true,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Senha muito fraca, deve conter números, letras e simbolos',
  })
  password: string;
}
