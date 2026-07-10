import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Business, BusinessType } from '../entities/business.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectivePurchase } from '@/collectivePurchase/entities/collectivePurchase.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { ConversationService } from '@/conversation/services/conversation.service';
import { ConversationMessageService } from '@/conversation/services/conversationMessage.service';
import { Transactional } from 'typeorm-transactional';
import { BusinessDesk } from '@/businessDesk/entities/businessDesk.entity';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { SendMessageUseCase } from '@/conversation/useCases/sendMessage.usecase';
import { CooperativeDebitService } from '@/cooperativeDebit/cooperativeDebit.service';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly conversationService: ConversationService,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly debitService: CooperativeDebitService,
  ) {}

  @Transactional()
  async createBusiness(data: {
    offeringCooperativeId: number;
    requestingCooperativeId: number;
    fee?: number;
    travelOffer?: TravelOffer;
    collectivePurchase?: CollectivePurchase;
    businessDesk?: BusinessDesk;
    initialMessage: string;
  }): Promise<Business> {
    const {
      offeringCooperativeId,
      requestingCooperativeId,
      travelOffer,
      collectivePurchase,
      businessDesk,
      fee,
      initialMessage,
    } = data;

    if (!travelOffer && !collectivePurchase && !businessDesk) {
      throw new BadRequestException('Não foi possivel determinar o tipo do negócio');
    }

    if (offeringCooperativeId === requestingCooperativeId) {
      throw new BadRequestException('A cooperativa oferente e requisitante devem ser diferentes.');
    }

    const businessType = travelOffer
      ? BusinessType.V
      : collectivePurchase
        ? BusinessType.CC
        : businessDesk
          ? BusinessType.BN
          : null;

    let titleConversation = undefined;
    let isDirect = true;

    if (businessType === BusinessType.V) {
      isDirect = false;
    }

    const conversation = await this.conversationService.createConversation(
      requestingCooperativeId,
      offeringCooperativeId,
      titleConversation,
      isDirect,
    );


    await this.sendMessageUseCase.execute(initialMessage, conversation.id, requestingCooperativeId);

    const newBusiness = this.businessRepository.create({
      offeringCooperative: { id: offeringCooperativeId } as Cooperative,
      requestingCooperative: { id: requestingCooperativeId } as Cooperative,
      fee: fee ?? 0,
      travelOffer,
      collectivePurchase,
      businessDesk,
      type: businessType,
      conversation,
    });

    return await this.businessRepository.save(newBusiness);
  }
}
