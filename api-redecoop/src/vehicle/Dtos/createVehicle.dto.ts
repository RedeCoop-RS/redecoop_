import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  typeId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  volume: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  maximumWeight: number;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Foto do Veiculo',
    format: 'binary',
  })
  @IsOptional()
  img?: string;

  @ApiPropertyOptional({ description: 'Definido apenas pelo admin' })
  @IsOptional()
  @IsNotEmpty()
  @IsInt()
  cooperativeId: number;
}
