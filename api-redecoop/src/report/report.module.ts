import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalog } from '@/catalog/entities/catalog.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { ProductsByCooperativeReportUseCase } from './useCases/productsByCooperative.usecase';
import { HandleReportsUseCase } from './useCases/handleReports.usecase';
import { ReportsAvailableUseCase } from './useCases/reportsAvailable.usecase';
import { Travel } from '@/travel/entities/travel.entity';
import { TravelsMadeByCooperativeUseCase } from './useCases/travelsMadeByCooperative.usecase';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { ProductsTransportedByCooperativeUseCase } from './useCases/productsTransportedByCooperative.usecase';
import { TravelRouteProduct } from '@/travel/entities/travelRouteProduct.entity';
import { TravelPriceReportUseCase } from './useCases/travelPrices.usecase';
import { Business } from '@/business/entities/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Catalog,
      Cooperative,
      Travel,
      TravelOffer,
      TravelRouteProduct,
      Business,
    ]),
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    ProductsByCooperativeReportUseCase,
    HandleReportsUseCase,
    ReportsAvailableUseCase,
    TravelsMadeByCooperativeUseCase,
    ProductsTransportedByCooperativeUseCase,
    TravelPriceReportUseCase,
  ],
})
export class ReportModule {}
