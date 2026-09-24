import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class PublicBudgetDto {
  @ApiProperty({ description: 'Nome do remetente' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  name: string;

  @ApiProperty({ description: 'E-mail do remetente' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Telefone do remetente' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 20)
  phone: string;

  @ApiProperty({ description: 'Assunto' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 100)
  subject: string;

  @ApiProperty({ description: 'Mensagem / descrição do orçamento' })
  @IsNotEmpty()
  @IsString()
  @Length(10, 2000)
  message: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Arquivos anexos (opcional)',
  })
  @IsOptional()
  files?: any[];
}
