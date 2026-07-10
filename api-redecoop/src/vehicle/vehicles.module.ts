import { Module } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Cooperative } from 'src/cooperative/entities/cooperative.entity';
import { VehicleType } from '../vehicleType/entities/vehicleType.entity';
import { CreateVehicleUseCase } from './useCases/createVehicle.usecase';
import { VehicleController } from './controllers/vehicle.controller';
import { UpdateVehicleUseCase } from './useCases/updateVehicle.usecase';
import { ListVehiclesUseCase } from './useCases/listVehicles.usecase';
import { GetVehiclesUseCase } from './useCases/getVehicle.usecase';
import { TravelModule } from '@/travel/travel.module';
import { UpdateVehicleActiveUseCase } from './useCases/updateVehicleActive.usecase';
import { ListVehiclesForSelectUseCase } from './useCases/listVehiclesForSelect.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, VehicleType, Cooperative]), TravelModule],
  controllers: [VehicleController],
  providers: [
    VehicleService,
    CreateVehicleUseCase,
    UpdateVehicleUseCase,
    ListVehiclesUseCase,
    GetVehiclesUseCase,
    UpdateVehicleActiveUseCase,
    ListVehiclesForSelectUseCase
  ],
  exports: [VehicleService],
})
export class VehicleModule {}
