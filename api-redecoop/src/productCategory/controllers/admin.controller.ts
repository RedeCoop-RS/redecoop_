import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { ProductCategoryService } from '../productCategory.service';
import { CreateProductCategoryDto } from '../Dtos/productCategoryCreate.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('ProductCategory')
@Controller('root/product-category')
@Roles(UserRole.ADMIN)
export class AdminProductCategoryController {
  constructor(private readonly productCategoryService: ProductCategoryService) {}

  @Post('create')
  @ApiOperation({ summary: 'Criar Categoria Produto' })
  async create(@Body() postData: CreateProductCategoryDto) {
    await this.productCategoryService.create(postData);
  }
}
