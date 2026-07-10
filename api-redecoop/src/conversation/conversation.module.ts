import { Module } from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversationMessage.entity';
import { ConversationMessageService } from './services/conversationMessage.service';
import { CommonConversationController } from './controllers/conversation.controller';
import { ConversationGateway } from './gateways/conversation.gateway';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { StartDirectConversationUseCase } from './useCases/startDirectConversation.usecase';
import { GetLastCooperativesTalkedToUseCase } from './useCases/getLastCooperativesTalkedTo.usecase';
import { GetDirectConversationsUseCase } from './useCases/getDirectConversations.usecase';
import { GetConversationUseCase } from './useCases/getConversation.usecase';
import { ApproveOrRejectMessageUseCase } from './useCases/approveOrRejectMessage.usecase';
import { SendMessageUseCase } from './useCases/sendMessage.usecase';
import { MarkAsReadMessageUseCase } from './useCases/markAsReadMessage.usecase';
import { EditMessageUseCase } from './useCases/editMessage.use.case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationMessage, Cooperative, TravelOffer]),
  ],
  controllers: [CommonConversationController],
  providers: [
    ConversationService,
    ConversationMessageService,
    ConversationGateway,
    StartDirectConversationUseCase,
    GetLastCooperativesTalkedToUseCase,
    GetDirectConversationsUseCase,
    GetConversationUseCase,
    ApproveOrRejectMessageUseCase,
    SendMessageUseCase,
    MarkAsReadMessageUseCase,
    EditMessageUseCase
  ],
  exports: [ConversationService, ConversationMessageService, SendMessageUseCase],
})
export class ConversationModule {}
