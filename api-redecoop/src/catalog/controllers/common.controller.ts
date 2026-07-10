import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../services/catalog.service';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';

@ApiBearerAuth()
@ApiTags('Catalog')
@Controller('common/catalog')
@Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
export class CommonCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @ApiOperation({
    summary: 'Procurar produtos pelo nome no catalogo da cooperativa',
  })
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('filter.cooperative.id') cooperativeIdRaw: string | undefined,
    @UserLogged() user: UserLoggedDto,
  ) {
    let adminCooperativeId: number | undefined;
    if (cooperativeIdRaw != null && cooperativeIdRaw !== '') {
      const n = parseInt(cooperativeIdRaw, 10);
      if (!Number.isNaN(n)) {
        adminCooperativeId = n;
      }
    }
    return await this.catalogService.searchProductsInCatalog(query, adminCooperativeId, user);
  }
}
