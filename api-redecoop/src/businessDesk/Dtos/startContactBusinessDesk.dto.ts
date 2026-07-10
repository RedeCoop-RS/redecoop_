
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class StartContactBusinessDeskDto {
  @ApiProperty()
  @IsInt()
  businessDeskId: number;

  @ApiProperty()
  @IsString()
  initialMessage: string;
}
