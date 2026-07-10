import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EmailVisitantWithFileDto {
  @ApiProperty({
    type: 'string',
    description: 'Assunto do e-mail',
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({
    type: 'string',
    description: 'Mensagem do e-mail',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Arquivos para anexar (PDF, imagens, etc)'
  })
  files: any[];
}

export class EmailVisitantDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}