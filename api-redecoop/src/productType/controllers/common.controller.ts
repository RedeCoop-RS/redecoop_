import { Roles } from '@/_common/decorators/role.decorator';
import { Controller, Get } from '@nestjs/common';
import { ProductTypeService } from '../productType.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductTypeSummaryDto } from '../Dtos/productTypeResponse.dto';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('ProductType')
@Controller('common/product-type')
@Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
export class CommonProductTypeController {
  constructor(private readonly productTypeService: ProductTypeService) {}

  @Get('list')
  @ApiOperation({ summary: 'Listar todos os tipos de produtos' })
  @ApiResponse({ type: ProductTypeSummaryDto, isArray: true })
  async listProductTypeOptions() {
    return await this.productTypeService.listProductTypeOptions();
  }
}
