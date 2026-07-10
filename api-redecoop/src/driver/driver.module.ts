import { Module } from '@nestjs/common';
import { DriverService } from './services/driver.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { User } from 'src/User/entities/user.entity';
import { Cooperative } from '../cooperative/entities/cooperative.entity';
import { UserModule } from '@/User/user.module';
import { Travel } from '@/travel/entities/travel.entity';
import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { ListDriversUseCase } from './useCases/listDrivers.usecase';
import { UpdateDriversUseCase } from './useCases/updateDriver.usecase';
import { CreateDriversUseCase } from './useCases/createDriver.usecase';
import { GetDriversUseCase } from './useCases/getDriver.usecase';
import { DriverController } from './controllers/driver.controller';
import { StartTravelUseCase } from './useCases/startTravel.usecase';
import { ListTravelsUseCase } from './useCases/listTravels.usecase';
import { CountCompletedTripsUseCase } from './useCases/countCompletedTravels.usecase';
import { TravelModule } from '@/travel/travel.module';
import { AttachFileToRouteUseCase } from './useCases/attachFileToRoute.usecase';
import { MarkArrivalRouteUseCase } from './useCases/markArrivalRoute.usecase';
import { UpdateDriverActiveUseCase } from './useCases/updateDriverActive.usecase';
import { ListDriversForSelectUseCase } from './useCases/listDriversForSelect.usecase';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { Business } from '@/business/entities/business.entity';
import { CooperativeDebitModule } from '@/cooperativeDebit/cooperativeDebit.module';

@Module({
  imports: [
    CooperativeDebitModule,
    TypeOrmModule.forFeature([
      Driver,
      User,
      Cooperative,
      Travel,
      TravelRoute,
      TravelOffer,
      Business,
    ]),
    UserModule,
    TravelModule,
  ],
  controllers: [DriverController],
  providers: [
    AttachFileToRouteUseCase,
    DriverService,
    ListDriversUseCase,
    UpdateDriversUseCase,
    CreateDriversUseCase,
    GetDriversUseCase,
    StartTravelUseCase,
    ListTravelsUseCase,
    CountCompletedTripsUseCase,
    MarkArrivalRouteUseCase,
    UpdateDriverActiveUseCase,
    ListDriversForSelectUseCase,
  ],
  exports: [DriverService],
})
export class DriverModule {}
