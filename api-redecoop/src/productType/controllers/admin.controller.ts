import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { ProductTypeService } from '../productType.service';
import { CreateProductTypeDto } from '../Dtos/productTypeCreate.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('ProductType')
@Controller('root/product-type')
@Roles(UserRole.ADMIN)
export class AdminProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Post('create')
  @ApiOperation({ summary: 'Criar Tipo de produto' })
  async create(@Body() postData: CreateProductTypeDto) {
    return await this.productTypeService.create(postData);
  }
}
