import { Module } from '@nestjs/common';
import { BusinessService } from './services/business.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from './entities/business.entity';
import { ConversationModule } from '@/conversation/conversation.module';
import { ConversationMessage } from '@/conversation/entities/conversationMessage.entity';
import { UpdateStatusBusinessUseCase } from './useCases/updateStatusBusiness.usecase';
import { ListBusinessForCooperativeUseCase } from './useCases/listBusinessForCooperative.usecase';
import { ListBusinessForAdminUseCase } from './useCases/listBusinessForAdmin.usecase';
import { BusinessController } from './controllers/business.controller';
import { CooperativeDebitModule } from '@/cooperativeDebit/cooperativeDebit.module';
import { ReadByIdBusinessUseCase } from './useCases/readByIdBusiness.usecase';
import { ChangeValueBusinessUseCase } from './useCases/changeValueBusiness.usecase';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';

@Module({
  imports: [
    CooperativeDebitModule,
    ConversationModule,
    TypeOrmModule.forFeature([Business, ConversationMessage, TravelOffer]),
  ],
  controllers: [BusinessController],
  providers: [
    BusinessService,
    UpdateStatusBusinessUseCase,
    ListBusinessForCooperativeUseCase,
    ListBusinessForAdminUseCase,
    ReadByIdBusinessUseCase,
    ChangeValueBusinessUseCase
  ],
  exports: [BusinessService, TypeOrmModule],
})
export class BusinessModule {}
