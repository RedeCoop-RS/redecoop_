import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateOrCreateVehicleType {
  @ApiPropertyOptional({
    description: 'ID do tipo de veiculo, informado apenas se for atualizar',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  id: number;

  @ApiProperty({
    required: true,
    description: 'Nome do Tipo',
    example: 'Refrigerado',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    description: 'Multiplicador',
    example: 5.0,
  })
  @IsNotEmpty()
  @IsNumber()
  mpy: number;
}
