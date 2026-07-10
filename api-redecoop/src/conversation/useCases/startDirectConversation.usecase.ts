import { BadRequestException, Injectable } from '@nestjs/common';
import { StartDirectConversationDto } from '../Dtos/startDirectConversation.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { Transactional } from 'typeorm-transactional';
import { ConversationService } from '../services/conversation.service';
import { ConversationMessageService } from '../services/conversationMessage.service';
import { ConversationDto } from '../Dtos/conversation.dto';
import { plainToInstance } from 'class-transformer';
import { SendMessageUseCase } from './sendMessage.usecase';

@Injectable()
export class StartDirectConversationUseCase {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly conversationMessageService: ConversationMessageService,
    private readonly sendMessageUseCase: SendMessageUseCase,
  ) {}

  @Transactional()
  async execute(data: StartDirectConversationDto, user: UserLoggedDto) {
    const { cooperativeId, title, message } = data;

    if (cooperativeId === user.sub) {
      throw new BadRequestException('Você não pode iniciar uma conversa consigo mesmo.');
    }

    const conversation = await this.conversationService.createConversation(
      user.sub,
      cooperativeId,
      title,
      true,
    );

    await this.sendMessageUseCase.execute(message, conversation.id, user.sub);

    return plainToInstance(ConversationDto, conversation);
  }
}
