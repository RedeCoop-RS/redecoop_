import { Public } from '@/_common/decorators/skipAuth.decorator';
import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetCooperativeForPublicUseCase } from '../useCases/getCooperativeForPublic.usecase';
import { ListCooperativesForPublicUseCase } from '../useCases/listCooperativesForPublic.usecase';
import { CooperativeService } from '../cooperative.service';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { ApiOkResponsePaginated, Paginate } from '@/_common/utils/paginate/decorator';
import { CooperativeDto } from '../Dtos/cooperativeResponse.dto';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { ProductDto } from '@/product/Dtos/product.dto';
import { ListCooperativeProductsUseCase } from '../useCases/listCooperativeProducts.usecase';
import { ListPublicCatalogProductsUseCase } from '../useCases/listPublicCatalogProducts.usecase';
import { PublicCatalogProductDto } from '../Dtos/publicCatalogProduct.dto';

@ApiBearerAuth()
@ApiTags('Public')
@Controller('public/cooperative')
@Public()
export class PublicCooperativeController {
  constructor(
    private readonly getCooperativeForPublicUseCase: GetCooperativeForPublicUseCase,
    private readonly listCooperativesForPublicUseCase: ListCooperativesForPublicUseCase,
    private readonly listCooperativeProductsUseCase: ListCooperativeProductsUseCase,
    private readonly listPublicCatalogProductsUseCase: ListPublicCatalogProductsUseCase,
  ) {}

  @Get('list')
  @ApiOperation({
    summary: 'Listar Cooperativas',
  })
  async list() {
    return await this.listCooperativesForPublicUseCase.execute();
  }

  @Get('catalog-products')
  @PaginatedSwagger({ filterableColumns: ['typeId', 'categoryId'] })
  @ApiOperation({
    summary: 'Listar produtos do catálogo (RedeCoop) com sazonalidade e capacidade',
    description:
      'Sem cooperativeId retorna todos os produtos de todas as cooperativas ativas. Com cooperativeId filtra por cooperativa.',
  })
  @ApiQuery({
    name: 'cooperativeId',
    required: false,
    type: Number,
    description: 'ID da cooperativa para filtrar (omitir para visão geral da RedeCoop)',
  })
  @ApiOkResponsePaginated(PublicCatalogProductDto)
  async listCatalogProducts(
    @Paginate() query: PaginateQuery,
    @Query('cooperativeId') cooperativeIdStr?: string,
  ) {
    let cooperativeId: number | undefined;
    if (cooperativeIdStr !== undefined && cooperativeIdStr !== '' && cooperativeIdStr !== 'null') {
      const n = Number(cooperativeIdStr);
      if (!Number.isFinite(n) || n < 1) {
        throw new BadRequestException('cooperativeId inválido');
      }
      cooperativeId = n;
    }
    return await this.listPublicCatalogProductsUseCase.execute(cooperativeId, query);
  }

  @Get(':id/view')
  @ApiOperation({
    summary: 'Ver Cooperativa por ID',
  })
  async view(@Param('id', ParseIntPipe) id: number) {
    return await this.getCooperativeForPublicUseCase.execute(id);
  }

  @Get(':id/list-products')
  @PaginatedSwagger({ filterableColumns: ['typeId', 'categoryId'] })
  @ApiOperation({
    summary: 'Listar Produtos e filtrar',
  })
  @ApiOkResponsePaginated(ProductDto)
  async listProducts(@Param('id', ParseIntPipe) id: number, @Paginate() query: PaginateQuery) {
    return await this.listCooperativeProductsUseCase.execute(id, query);
  }
}
