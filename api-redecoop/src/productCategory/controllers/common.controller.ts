import { Roles } from '@/_common/decorators/role.decorator';
import { Controller, Get } from '@nestjs/common';
import { ProductCategoryService } from '../productCategory.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductCategoryResponseDto } from '../Dtos/productCategoryResponse.dto';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('ProductCategory')
@Controller('common/product-category')
@Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
export class CommonProductCategoryController {
  constructor(private readonly productCategoryService: ProductCategoryService) {}

  @Get('list')
  @ApiOperation({ summary: 'Listar todas as categorias de produto' })
  @ApiResponse({ type: ProductCategoryResponseDto, isArray: true })
  async list() {
    return await this.productCategoryService.list();
  }
}
