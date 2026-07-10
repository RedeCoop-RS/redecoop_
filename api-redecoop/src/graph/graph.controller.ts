import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CooperativesByMunicipalityGraphUseCase } from './useCases/cooperativesByMucipality.usecase';
import { GraphDto } from './Dtos/graph.dto';
import { Public } from '@/_common/decorators/skipAuth.decorator';
import { ProductCategoriesGraphUseCase } from './useCases/productCategories.usecase';
import { VisitantsByMunicipalityGraphUseCase } from './useCases/visitantsByMucipality.usecase';
import { VisitantsByTypeGraphUseCase } from './useCases/visitantsByType.usecase';

@ApiBearerAuth()
@ApiTags('Graph')
@Controller('graph')
@Public()
@SerializeOptions({ excludeExtraneousValues: false })
export class GraphController {
  constructor(
    private readonly cooperativesByMunicipalityGraphUseCase: CooperativesByMunicipalityGraphUseCase,
    private readonly productCategoriesGraphUseCase: ProductCategoriesGraphUseCase,
    private readonly visitantByMunicipalityGraphUseCase: VisitantsByMunicipalityGraphUseCase,
    private readonly visitantByTypeGraphUseCase: VisitantsByTypeGraphUseCase,
  ) {}

  @Get('total-cooperatives-by-municipality')
  async TotalCooperativesByMunicipality(): Promise<GraphDto> {
    return await this.cooperativesByMunicipalityGraphUseCase.execute();
  }

  @Get('total-product-categories')
  async TotalProductCategories(): Promise<GraphDto> {
    return await this.productCategoriesGraphUseCase.execute();
  }

  @Get('total-visitants-by-municipality')
  async TotalVisitantsByMunicipality(): Promise<GraphDto> {
    return await this.visitantByMunicipalityGraphUseCase.execute();
  }

  @Get('total-visitants-by-type')
  async TotalVisitantsByType(): Promise<GraphDto> {
    return await this.visitantByTypeGraphUseCase.execute();
  }
}
