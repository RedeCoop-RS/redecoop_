import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValueRange } from './entities/valueRange.entity';
import { ValueRangeService } from './valueRange.service';
import { DistanceRange } from '@/distanceRange/entities/distanceRange.entity';
import { WeightRange } from '@/weightRange/entities/weightRange.entity';
import { DistanceRangeModule } from '@/distanceRange/distanceRange.module';
import { WeightRangeModule } from '@/weightRange/weightRange.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ValueRange, DistanceRange, WeightRange]),
    DistanceRangeModule,
    WeightRangeModule,
  ],
  controllers: [],
  providers: [ValueRangeService],
  exports: [ValueRangeService]
})
export class ValueRangeModule { }
