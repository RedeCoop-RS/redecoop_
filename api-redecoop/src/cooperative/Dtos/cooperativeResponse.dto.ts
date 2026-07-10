import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { CityDto } from '@/city/Dtos/city.dto';
import { UserDto } from '@/User/Dtos/user.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { City } from '@/city/entities/city.entity';
import { CooperativeType } from '../enums/cooperativeType.enum';

export class CooperativeSummaryDto {
  @Expose()
  @ApiProperty()
  id: number;

  @ApiProperty()
  @Expose()
  companyName: string;

  @ApiProperty()
  @Expose()
  fantasyName: string;

  @ApiProperty()
  @Expose()
  img: string;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => City)
  city: City;
}

export class CooperativeDto {
  @Expose()
  @ApiProperty()
  id: number;
  @ApiProperty()
  @Expose()
  companyName: string;
  @ApiProperty()
  @Expose()
  fantasyName: string;
  @Expose()
  @ApiProperty()
  email: string;
  @Expose()
  @ApiProperty()
  description: string;
  @Expose()
  @ApiProperty()
  cnpj: string;
  @Expose()
  @ApiProperty()
  website: string;
  @Expose()
  @ApiProperty()
  phone: string;
  @Expose()
  @ApiProperty()
  instagram: string;
  @Expose()
  @ApiProperty()
  facebook: string;
  @Expose()
  @ApiProperty()
  street: string;
  @Expose()
  @ApiProperty()
  cep: string;
  @Expose()
  @ApiProperty()
  number: string;
  @Expose()
  @ApiProperty()
  cityId: number;
  @Expose()
  @ApiProperty()
  neighborhood: string;
  @ApiProperty()
  @Expose()
  @ApiProperty()
  complement: string;
  @Expose()
  @ApiProperty()
  img: string;
  @Expose()
  @ApiProperty()
  active: boolean;
  @Expose()
  @ApiProperty()
  createdAt: Date;
  @Expose()
  @ApiProperty()
  updatedAt: Date;
  @Expose()
  @ApiProperty()
  @Type(() => CityDto)
  city?: CityDto;
  @Expose()
  @ApiProperty()
  @Type(() => UserDto)
  user?: UserDto;
  @Expose()
  @ApiProperty()
  registrationCompletedAt: Date;

  @Expose()
  @ApiPropertyOptional()
  totalDebits?: number;

  @Expose()
  @ApiProperty()
  maleAssociates: number;

  @Expose()
  @ApiProperty()
  femaleAssociates: number;

  @Expose()
  @ApiProperty()
  youngAssociates: number;

  @Expose()
  @ApiProperty()
  @Transform(({ obj }) => (obj.maleAssociates ?? 0) + (obj.femaleAssociates ?? 0) + (obj.youngAssociates ?? 0))
  totalAssociates: number;

  @Expose()
  @ApiProperty({ enum: CooperativeType })
  type: CooperativeType;

  @Expose()
  @ApiProperty()
  DAP: string;

  @Expose()
  @ApiProperty({ type: [CityDto] })
  @Type(() => CityDto)
  @Transform(({ obj }) => obj.deliveryCities?.map((dc) => dc.city) || [])
  cooperativeDeliveryCities: CityDto[];
}
