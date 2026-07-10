import { Exclude, Expose, Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitantDto } from '@/visitant/Dtos/visitant.dto';
import { DriverResponseDto } from '@/driver/Dtos/driverResponse.dto';
import { CooperativeDto } from '@/cooperative/Dtos/cooperativeResponse.dto';

export class UserDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  username: string;

  @Exclude()
  password: string;

  @ApiProperty()
  @Expose()
  role: UserRole;

  @ApiPropertyOptional({
    type: () => CooperativeDto,
    description: '(Opcional) Retorna apenas se o usuario for uma cooperativa ou ADMIN',
  })
  @Expose()
  @Type(() => CooperativeDto)
  cooperative?: CooperativeDto;

  @ApiPropertyOptional({
    type: () => VisitantDto,
    description: '(Opcional) Retorna apenas se o usuario for um Visitante',
  })
  @Expose()
  @Type(() => VisitantDto)
  visitant?: VisitantDto;

  @ApiPropertyOptional({
    type: () => DriverResponseDto,
    description: '(Opcional) Retorna apenas se o usuario for um Motorista',
  })
  @Expose()
  @Type(() => DriverResponseDto)
  driver?: DriverResponseDto;
}
