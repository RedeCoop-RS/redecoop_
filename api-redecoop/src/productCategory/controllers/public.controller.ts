import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/_common/decorators/skipAuth.decorator';
import { ProductCategoryService } from '../productCategory.service';

@ApiTags('Public')
@Controller('public/product-category')
@Public()
export class PublicProductCategoryController {
  constructor(private readonly productCategoryService: ProductCategoryService) {}
  @ApiOperation({
    summary: 'Listar Categorias',
  })
  @Get('list')
  async listProductCategories() {
    return await this.productCategoryService.list();
  }
}
