import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { UserRole } from '@/User/entities/user.entity';
import { UserDto } from '@/User/Dtos/user.dto';
import { VisitantDto } from '@/visitant/Dtos/visitant.dto';
import { DriverResponseDto } from '@/driver/Dtos/driverResponse.dto';

export class AuthLoginDto {
  @ApiProperty({
    example: 'cooperativa@email.com',
    required: true,
    description: 'Email da cooperativa',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: '123456',
    required: true,
    description: 'Senha da cooperativa',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ExchangeTokenDto {
  @ApiProperty({
    example: '0f77911c-e5c6-4dcb-b8d0-096f87e63d6e',
    required: true,
    description: 'Token gerado no login',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'O token tem o formato inválido' })
  token: string;
}

export class AuthLoginResponseDto {
  @ApiPropertyOptional({ type: UserDto })
  @Expose()
  @Type(() => UserDto)
  userData?: UserDto;

  @ApiProperty()
  @Expose()
  token: string;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiPropertyOptional()
  @Expose()
  redirectUrl?: string;
}

export class ExchangeTokenResponseDto {
  @ApiProperty()
  @Expose()
  token: string;

  @ApiProperty({ type: UserDto })
  @Expose()
  user: UserDto;
}
