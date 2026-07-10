import { Module } from '@nestjs/common';
import { CityService } from './city.service';
import { CityController } from './controllers/city.controller';
import { City } from './entities/city.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([City])],
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService]
})
export class CityModule { }
