import { Module } from '@nestjs/common';
import { CooperativeBusinessDeskController } from './controllers/cooperative.controller';
import { BusinessDeskService } from './businessDesk.service';
import { AdminBusinessDeskController } from './controllers/admin.controller';
import { BusinessDesk } from './entities/businessDesk.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalog } from '@/catalog/entities/catalog.entity';
import { BusinessDeskProduct } from '@/businessDeskProduct/entities/businessDeskProduct.entity';
import { CommonBusinessDeskController } from './controllers/common.controller';
import { BusinessModule } from '@/business/business.module';
import { BusinessDeskProductModule } from '@/businessDeskProduct/businessDeskProduct.module';
import { UpdateOpportunityActiveStatusUseCase } from './useCases/updateOpportunityActiveStatus.usecase';

@Module({
  imports: [
    BusinessModule,
    BusinessDeskProductModule,
    TypeOrmModule.forFeature([BusinessDesk, BusinessDeskProduct]),
  ],
  controllers: [
    CooperativeBusinessDeskController,
    AdminBusinessDeskController,
    CommonBusinessDeskController,
  ],
  providers: [BusinessDeskService, UpdateOpportunityActiveStatusUseCase],
  exports: [BusinessDeskService],
})
export class BusinessDeskModule {}
