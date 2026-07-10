import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Conversation } from '../entities/conversation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { plainToInstance } from 'class-transformer';
import { ConversationDto } from '../Dtos/conversation.dto';
import { UserRole } from '@/User/entities/user.entity';
import { MessageStatus } from '../entities/conversationMessage.entity';
import { MessageTemplates } from '../messageTemplates';
import { ConversationMessageService } from '../services/conversationMessage.service';

@Injectable()
export class GetConversationUseCase {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly conversationMessageService: ConversationMessageService,
  ) {}

  async execute(id: number, user: UserLoggedDto) {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: {
        business:true,
        messages: { conversation: true, cooperative: true },
        initiatorCooperative: true,
        participantCooperative: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (
      user.role !== UserRole.ADMIN &&
      conversation.initiatorCooperative.id !== user.sub &&
      conversation.participantCooperative.id !== user.sub
    ) {
      throw new BadRequestException('Você não é participante desta conversa');
    }

    conversation.messages = conversation.messages.map((message) => {
      const isUserSender = message.cooperative.id === user.sub;
      return {
        ...message,
        content: this.conversationMessageService.processMessage(message, user),
        isSender: isUserSender,
      };
    });

    return plainToInstance(ConversationDto, conversation);
  }
}
