import { TypeOrmModule } from "@nestjs/typeorm";
import { VehicleType } from "./entities/vehicleType.entity";
import { VehicleTypeService } from "./vehicleType.service";
import { Module } from "@nestjs/common";
import { CommonVehicleTypeController } from "./controllers/common.controller";

 
@Module({
    imports: [TypeOrmModule.forFeature([VehicleType])],
    controllers: [CommonVehicleTypeController],
    providers: [VehicleTypeService],
    exports: [VehicleTypeService]
})
export class VehicleTypeModule { }
