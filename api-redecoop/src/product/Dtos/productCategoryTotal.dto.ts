import { ApiProperty } from '@nestjs/swagger';

export class CategoryTotalDto {
  @ApiProperty()
  categoryId: number;
  @ApiProperty()
  categoryName: string;
  @ApiProperty()
  total: number;
}
