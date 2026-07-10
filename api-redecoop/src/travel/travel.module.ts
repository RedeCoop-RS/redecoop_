import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TravelRoute } from './entities/travelRoute.entity';
import { Travel } from './entities/travel.entity';
import { Vehicle } from '@/vehicle/entities/vehicle.entity';
import { Driver } from '@/driver/entities/driver.entity';
import { CommonTravelController } from './controllers/travel.controller';
import { TravelService } from './services/travel.service';
import { TravelRouteService } from './services/travelRoute.service';
import { TravelOffer } from '../travelOffer/entities/travelOffer.entity';
import { TravelRouteProduct } from './entities/travelRouteProduct.entity';
import { CatalogModule } from '@/catalog/catalog.module';
import { MapsModule } from '@/maps/maps.module';
import { CreateTravelUseCase } from './useCases/createTravel.usecase';
import { UpdateTravelUseCase } from './useCases/updateTravel.usecase';
import { GetAvailableTravelUseCase } from './useCases/getAvailableTravels.usecase';
import { GetMyTravelsUseCase } from './useCases/getMyTravels.usecase';
import { GetTravelUseCase } from './useCases/getTravel.usecase';
import { GetTravelWithOffersUseCase } from './useCases/getTravelWithOffers.usecase';
import { GetTravelsUseCase } from './useCases/getTravels.usecase';
import { AttachFileToRouteCooperativeUseCase } from './useCases/attachFileToRouteCooperative.usecase';
import { DeleteTravelUseCase } from './useCases/deleteTravel.usecase';
import { FinalizeTravelUseCase } from './useCases/finalizeTravel.usecase';

@Module({
  imports: [
    CatalogModule,
    MapsModule,
    TypeOrmModule.forFeature([
      Travel,
      TravelRoute,
      TravelOffer,
      Vehicle,
      Driver,
      TravelRouteProduct,
    ]),
  ],
  controllers: [CommonTravelController],
  providers: [
    TravelService,
    TravelRouteService,
    CreateTravelUseCase,
    UpdateTravelUseCase,
    GetAvailableTravelUseCase,
    GetMyTravelsUseCase,
    GetTravelUseCase,
    GetTravelWithOffersUseCase,
    GetTravelsUseCase,
    AttachFileToRouteCooperativeUseCase,
    DeleteTravelUseCase,
    FinalizeTravelUseCase,
  ],
  exports: [TravelRouteService, TravelService],
})
export class TravelModule {}
