import { UserRole } from '@/User/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';

@Injectable()
export class ConversationMessageService {
  constructor() {}

  processMessage(message: ConversationMessage, user: UserLoggedDto): string {
    const isUserAdmin = user.role === UserRole.ADMIN;
    const isUserSender = message.cooperative.id === user.sub;

    if (message.status === MessageStatus.Pending && !message.conversation.isDirect) {
      message.content =
        isUserAdmin || isUserSender
          ? message.content
          : `Você já recebeu uma resposta!<br/><br/>Aguarde a intermediação da Rede Coop para lê-la.`;
    }

    if (message.status === MessageStatus.Rejected) {
      message.content =
        isUserAdmin || isUserSender
          ? message.content
          : '<span><b>Mensagem Reprovada pela RedeCoop</b><span>';
    }
    return message.content; 
  }

  processMessages(messages: ConversationMessage[], user: UserLoggedDto): any[] {
    return messages.map((message) => this.processMessage(message, user));
  }
}
