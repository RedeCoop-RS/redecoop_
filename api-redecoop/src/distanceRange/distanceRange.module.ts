import { Module } from '@nestjs/common';
import { DistanceRangeService } from './distanceRange.service';
import { DistanceRange } from './entities/distanceRange.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([DistanceRange])],
  controllers: [],
  providers: [DistanceRangeService],
  exports: [DistanceRangeService]
})
export class DistanceRangeModule { }
