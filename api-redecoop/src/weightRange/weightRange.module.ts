import { Module } from '@nestjs/common';
import { WeightRangeService } from './weightRange.service';
import { WeightRange } from './entities/weightRange.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([WeightRange])],
  controllers: [],
  providers: [WeightRangeService],
  exports: [WeightRangeService]
})
export class WeightRangeModule { }
