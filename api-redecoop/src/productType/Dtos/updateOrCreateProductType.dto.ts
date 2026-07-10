import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateOrCreateProductType {
  @ApiPropertyOptional({
    description: 'ID do tipo de produto, informado apenas se for atualizar',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  id: number;

  @ApiProperty({
    required: true,
    description: 'Nome do Tipo',
    example: 'Tubérculo',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    description: 'Multiplicador',
    example: 2.5,
  })
  @IsNotEmpty()
  @IsNumber()
  mpy: number;
}
