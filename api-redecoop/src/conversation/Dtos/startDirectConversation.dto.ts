import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class StartDirectConversationDto {
  @ApiProperty({
    example: 1,
    required: true,
    description: 'ID da cooperativa',
  })
  @IsInt()
  cooperativeId: number;

  @ApiProperty({
    example: 'Viagens',
    required: true,
    description: 'Assunto/Titulo da conversa',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Olá, tudo bem?',
    required: true,
    description: 'Mensagem',
  })
  @IsString()
  message: string;
}
