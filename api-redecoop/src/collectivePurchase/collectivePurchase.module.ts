import { Module } from '@nestjs/common';
import { CollectivePurchaseService } from './collectivePurchase.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectivePurchase } from './entities/collectivePurchase.entity';
import { BusinessModule } from '@/business/business.module';
import { StartTradingCollectivePurchaseUseCase } from './useCases/startTradingCollectivePurchase.usecase';
import { CreateCollectivePurchaseUseCase } from './useCases/createCollectivePurchase.usecase';
import { GetCollectivePurchaseUseCase } from './useCases/getCollectivePurchase.usecase';
import { ListCollectivePurchaseUseCase } from './useCases/listCollectivePurchases.usecase';
import { CollectivePurchaseController } from './controllers/collectivePurchase.controller';
import { UpdateCollectivePurchaseUseCase } from './useCases/updateCollectivePurchase.usecase';
import { UpdateCollectivePurchaseStatusUseCase } from './useCases/updateCollectivePurchaseStatus.usecase';

@Module({
  imports: [BusinessModule, TypeOrmModule.forFeature([CollectivePurchase])],
  controllers: [CollectivePurchaseController],
  providers: [
    CollectivePurchaseService,
    StartTradingCollectivePurchaseUseCase,
    CreateCollectivePurchaseUseCase,
    GetCollectivePurchaseUseCase,
    ListCollectivePurchaseUseCase,
    UpdateCollectivePurchaseUseCase,
    UpdateCollectivePurchaseStatusUseCase
  ],
  exports: [],
})
export class CollectivePurchaseModule {}
