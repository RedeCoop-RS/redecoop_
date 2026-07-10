import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class attachInRouteDto {
  @IsNotEmpty()
  @ApiProperty({
    type: 'string',
    description: 'Arquivo',
    format: 'binary',
  })
  file: Express.Multer.File;
}
