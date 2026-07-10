import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { BusinessType } from '@/business/entities/business.entity';
import { OfferStatus, TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { NotificationService } from '@/notification/notification.service';
import { NotificationType } from '@/notification/entities/notification.entity';
import { NotificationMessages } from '@/notification/notification-messages';
import { Transactional } from 'typeorm-transactional';
import { Conversation } from '../entities/conversation.entity';

@Injectable()
export class ApproveOrRejectMessageUseCase {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: Repository<ConversationMessage>,
    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
    private readonly notificationService: NotificationService,
  ) {}

  @Transactional()
  async execute(messageId: number, approved: boolean) {
    const message = await this.conversationMessageRepository.findOne({
      where: { id: messageId },
      relations: {
        cooperative: true,
        conversation: { business: { travelOffer: { travel: true } } },
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada!');
    }

    const travelOffer = message.conversation.business.travelOffer;

    if (!travelOffer) {
      throw new BadRequestException(
        'Essa mensagem não faz parte de um negócio, não é possivel alterar seu status!',
      );
    }

    if (approved) {
      if (
        message.conversation.business.type === BusinessType.V &&
        message.cooperativeId === message.conversation.initiatorCooperativeId
      ) {
        const messageCount = await this.conversationMessageRepository.count({
          where: {
            conversation: { id: message.conversation.id },
            cooperative: { id: message.cooperativeId },
            status: MessageStatus.Approved,
            revisedAt: Not(IsNull()),
          },
        });

        if (messageCount === 0) {
          travelOffer.status = OfferStatus.Negotiating;
          await this.travelOfferRepository.save(travelOffer);
        }
      }

      message.status = MessageStatus.Approved;
    } else {
      message.status = MessageStatus.Rejected;

      //notificar que a mensagem enviada foi negada
      await this.notificationService.sendNotification(
        NotificationType.TRAVEL_OFFER,
        NotificationMessages.MESSAGE_DENIED(travelOffer.travel.startDateTime),
        message.conversation.initiatorCooperativeId,
      );
    }

    message.revisedAt = new Date();
    const messageUpdated = await this.conversationMessageRepository.save(message);

    return messageUpdated;
  }
}
