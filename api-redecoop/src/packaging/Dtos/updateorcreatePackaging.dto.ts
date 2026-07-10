import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrCreatePackagingTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id: number;


  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}
