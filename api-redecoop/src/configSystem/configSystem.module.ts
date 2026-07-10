import { Module } from '@nestjs/common';
import { AdminConfigSystemController } from './controllers/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductType } from '@/productType/entities/productType.entity';
import { ConfigSystem } from './entities/configSystem.entity';
import { VehicleType } from '@/vehicleType/entities/vehicleType.entity';
import { ConfigSystemService } from './configSystem.service';
import { ProductCategory } from '@/productCategory/entities/productCategory.entity';
import { Packaging } from '@/packaging/entities/packaging.entity';
import { DistanceRange } from '@/distanceRange/entities/distanceRange.entity';
import { WeightRange } from '@/weightRange/entities/weightRange.entity';
import { ValueRange } from '@/valueRange/entities/valueRange.entity';
import { ValueRangeService } from '@/valueRange/valueRange.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductType, ConfigSystem, VehicleType, ProductCategory, Packaging, DistanceRange, WeightRange, ValueRange]),
  ],
  controllers: [AdminConfigSystemController],
  providers: [ConfigSystemService],
  exports: [ConfigSystemService],
})
export class ConfigSystemModule {}
