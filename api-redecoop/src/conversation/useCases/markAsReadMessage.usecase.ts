import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MarkAsReadMessageUseCase {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: Repository<ConversationMessage>,
  ) {}

  async execute(messageId: number, cooperativeId: number) {
    const message = await this.conversationMessageRepository.findOne({
      where: { id: messageId },
      relations: { cooperative: true },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    if (message.cooperative?.id == cooperativeId) {
      return;
    }

    if (!message.seen && message.status === MessageStatus.Approved) {
      message.seen = true;
      await this.conversationMessageRepository.save(message);
    }
  }
}
