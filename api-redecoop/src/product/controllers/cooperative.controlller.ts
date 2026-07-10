import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { ProductService } from '../product.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductDto } from '../Dtos/product.dto';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('Product')
@Controller('cooperative/product')
@Roles(UserRole.COOPERATIVE)
export class CooperativeProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Listar todos os Produtos' })
  @ApiResponse({ type: ProductDto, isArray: true })
  @Get('list')
  async list() {
    return await this.productService.findAllForCooperative();
  }
}
