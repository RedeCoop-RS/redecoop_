import { Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
import { CityDto } from '@/city/Dtos/city.dto';

export class VisitantDto {
  @ApiProperty()
  @Expose()
  id: number;
  @ApiProperty()
  @Expose()
  name: string;
  @ApiProperty()
  @Expose()
  phone: string;
  @ApiProperty()
  @Expose()
  address: string;
  @ApiProperty()
  @Expose()
  email: string;
  @ApiProperty()
  @Expose()
  cep: string;
  @ApiProperty()
  @Expose()
  number: string;
  @ApiProperty()
  @Expose()
  cityId: number;
  @ApiProperty()
  @Expose()
  neighborhood: string;
  @ApiProperty()
  @Expose()
  active: boolean;
  @ApiProperty()
  @Type(() => CityDto)
  @Expose()
  city: CityDto;
}
