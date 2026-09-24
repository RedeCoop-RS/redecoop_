import { BadRequestException, Injectable } from '@nestjs/common';
import { Conversation } from '../entities/conversation.entity';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: Repository<ConversationMessage>,
  ) {}

  async createConversation(
    initiatorCooperative: number,
    participantCooperative: number,
    title?: string | null,
    isDirect = false,
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      initiatorCooperative: { id: initiatorCooperative },
      participantCooperative: { id: participantCooperative },
      title,
      isDirect,
    });
    return await this.conversationRepository.save(conversation);
  }

  async countMessagesNotSeenByMe(conversationId: number, cooperativeId: number): Promise<number> {
    return this.conversationMessageRepository.count({
      where: {
        conversation: { id: conversationId },
        seen: false,
        status: MessageStatus.Approved,
        cooperative: { id: Not(cooperativeId) },
      },
    });
  }

  async countMyMessagesNotSeen(conversationId: number, cooperativeId: number) {
    return this.conversationMessageRepository.count({
      where: {
        conversation: { id: conversationId },
        seen: false,
        cooperative: { id: cooperativeId },
      },
    });
  }

  async isParticipant(conversationId: number, cooperativeId: number): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: { initiatorCooperative: true, participantCooperative: true },
    });
    if (!conversation) return false;
    return (
      conversation.initiatorCooperative?.id === cooperativeId ||
      conversation.participantCooperative?.id === cooperativeId
    );
  }
}
