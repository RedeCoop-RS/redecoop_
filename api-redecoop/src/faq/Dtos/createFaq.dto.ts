import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'O titulo não pode estar vazio!' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'O Conteúdo não pode estar vazio' })
  @IsString()
  content: string;
}
