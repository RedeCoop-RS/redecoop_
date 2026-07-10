import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsNumber, IsPositive } from 'class-validator';

export class CreateBusinessDeskProductDto {
  @ApiProperty({
    example: 1,
    required: true,
  })
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @ApiProperty({
    example: 1000,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  weight: number;
}
