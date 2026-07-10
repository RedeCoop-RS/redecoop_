import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EditMessageUseCase {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly conversationMessageRepository: Repository<ConversationMessage>,
  ) {}

  async execute(messageId: number, newContent: string) {
    const message = await this.conversationMessageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada!');
    }

    message.content = newContent;

    await this.conversationMessageRepository.save(message);
  }
}
