import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Repository } from 'typeorm';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';
import { Transactional } from 'typeorm-transactional';
import { NotificationService } from '@/notification/notification.service';
import { NotificationType } from '@/notification/entities/notification.entity';
import { NotificationMessages } from '@/notification/notification-messages';
import { ConversationMessageService } from '../services/conversationMessage.service';
import * as moment from 'moment';

@Injectable()
export class SendMessageUseCase {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: Repository<ConversationMessage>,
    private readonly notificationService: NotificationService,
  
  ) {}

  /**
   * Envia uma mensagem para uma conversa específica.
   *
   * @param {string} content - O conteúdo da mensagem a ser enviada.
   * @param {number} conversationId - O ID da conversa para a qual a mensagem será enviada.
   * @param {number} cooperativeId - O ID da cooperativa que está enviando a mensagem.
   * @throws {NotFoundException} Se a conversa não for encontrada.
   * @throws {BadRequestException} Se a cooperativa não for parte da conversa.
   */
  @Transactional()
  async execute(content: string, conversationId: number, cooperativeId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['initiatorCooperative', 'participantCooperative'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada!');
    }

    if (
      conversation.initiatorCooperative.id !== cooperativeId &&
      conversation.participantCooperative.id !== cooperativeId
    ) {
      throw new BadRequestException('Você não pode enviar mensagem pois não faz parte da conversa');
    }

    conversation.lastMessage = new Date();

    await this.conversationRepository.save(conversation);

    const message = await this.conversationMessageRepository.save(
      this.conversationMessageRepository.create({
        content,
        conversation,
        cooperative: { id: cooperativeId },
        status: conversation.isDirect ? MessageStatus.Approved : MessageStatus.Pending,
        createdAt: moment().utc().format()
      }),
    );

    const [sendingCooperative, receivingCooperative] =
      conversation.initiatorCooperative.id === cooperativeId
        ? [conversation.initiatorCooperative, conversation.participantCooperative]
        : [conversation.participantCooperative, conversation.initiatorCooperative];

    await this.notificationService.sendNotification(
      NotificationType.NEW_MESSAGE,
      NotificationMessages.NEW_MESSAGE(sendingCooperative.companyName, content, conversationId),
      receivingCooperative.id,
    );

    return message;
  }
}
