import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { TravelOffer } from './entities/travelOffer.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { CommonTravelOfferController } from './controllers/common.controller';
import { TravelOfferService } from './travelOffer.service';
import { BusinessModule } from '@/business/business.module';
import { ConfigSystemModule } from '@/configSystem/configSystem.module';
import { ProductTypeModule } from '@/productType/productType.module';
import { VehicleTypeModule } from '@/vehicleType/vehicleType.module';
import { Travel } from '@/travel/entities/travel.entity';
import { TravelRouteProduct } from '@/travel/entities/travelRouteProduct.entity';
import { MapsModule } from '@/maps/maps.module';
import { TravelModule } from '@/travel/travel.module';
import { CooperativeTravelOfferController } from './controllers/cooperative.controller';
import { CreateTravelOfferUseCase } from './useCase/createTravelOffer.usecase';
import { Catalog } from '@/catalog/entities/catalog.entity';
import { UpdateTravelOfferUseCase } from './useCase/updateTravelOffer.usecase';
import { Product } from '@/product/entities/product.entity';
import { Vehicle } from '@/vehicle/entities/vehicle.entity';
import { CalculateOfferEstimateUseCase } from './useCase/calculateOfferEstimate.usecase';
import { ValueRangeService } from '@/valueRange/valueRange.service';
import { ValueRangeModule } from '@/valueRange/valueRange.module';

@Module({
  imports: [
    ConfigSystemModule,
    VehicleTypeModule,
    ProductTypeModule,
    MapsModule,
    BusinessModule,
    TravelModule,
    ValueRangeModule,
    TypeOrmModule.forFeature([
      TravelRoute,
      TravelOffer,
      Travel,
      TravelRouteProduct,
      Catalog,
      Product,
      Vehicle,
    ]),
  ],
  controllers: [CommonTravelOfferController, CooperativeTravelOfferController],
  providers: [
    TravelOfferService,
    CreateTravelOfferUseCase,
    UpdateTravelOfferUseCase,
    CalculateOfferEstimateUseCase,
  ],
})
export class TravelOfferModule {}
