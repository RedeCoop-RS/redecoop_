import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ContactVisitantDto {
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

  @ApiProperty({ description: 'Assunto da mensagem' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  subject: string;

  @ApiProperty({ description: 'Mensagem' })
  @IsNotEmpty()
  @IsString()
  @Length(10, 1000)
  message: string;
}