import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/_common/decorators/skipAuth.decorator';
import { ProductTypeService } from '../productType.service';

@ApiTags('Public')
@Controller('public/product-type')
@Public()
export class PublicProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Get('list')
  @ApiOperation({
    summary: 'Listar Tipos de Produtos',
  })
  async listProductTypes() {
    return await this.productTypeService.list();
  }
}
