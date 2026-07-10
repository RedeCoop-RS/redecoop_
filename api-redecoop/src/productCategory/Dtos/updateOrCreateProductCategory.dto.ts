import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrCreateProductCategory {
  @ApiPropertyOptional({
    required: true,
    description: 'ID da categoria do produto,informado apenas se for atualizar',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  id: number;

  @ApiProperty({
    required: true,
    description: 'Nome da categoria',
    example: 'Suco',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
