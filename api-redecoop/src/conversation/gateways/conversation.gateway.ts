import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationMessageService } from '../services/conversationMessage.service';
import {
  ClassSerializerInterceptor,
  Injectable,
  Logger,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { Roles } from '@/_common/decorators/role.decorator';
import { WsAuthGuard } from '@/_common/guards/wsAuth.guard';
import { SendMessageUseCase } from '../useCases/sendMessage.usecase';
import { ApproveOrRejectMessageUseCase } from '../useCases/approveOrRejectMessage.usecase';
import { MarkAsReadMessageUseCase } from '../useCases/markAsReadMessage.usecase';
import { MessageStatus } from '../entities/conversationMessage.entity';
import { EditMessageUseCase } from '../useCases/editMessage.use.case';
import { MessageTemplates } from '../messageTemplates';

@WebSocketGateway({ cors: true })
@UseInterceptors(ClassSerializerInterceptor)
export class ConversationGateway {
  @WebSocketServer() server: Server;

  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly approveOrRejectMessageUseCase: ApproveOrRejectMessageUseCase,
    private readonly markAsReadMessageUseCase: MarkAsReadMessageUseCase,
    private readonly editMessageUseCase: EditMessageUseCase,
    private readonly conversationMessageService: ConversationMessageService,
  ) {}

  @UseGuards(WsAuthGuard)
  @Roles(UserRole.ADMIN)
  @SubscribeMessage('listenAdminChatAlerts')
  listenAdminChatAlerts(@ConnectedSocket() socket: Socket) {
    socket.join('admin-chat-alerts');
  }

  @UseGuards(WsAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @SubscribeMessage('joinConversation')
  async joinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const roomName = `conversation-${data.conversationId}`;

    if (socket.rooms.has(roomName)) {
      return;
    }

    socket.join(roomName);
  }

  @SubscribeMessage('leaveConversation')
  async leftConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    socket.leave(`conversation-${data.conversationId}`);
  }

  @UseGuards(WsAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: number; content: string },
  ) {
    const user = socket.data.user as UserLoggedDto;
    try {
      const message = await this.sendMessageUseCase.execute(
        data.content,
        data.conversationId,
        user.sub,
      );

      const messageData = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        cooperativeId: message.cooperativeId,
        seen: message.seen,
        status: message.status,
      };

      socket.emit('newMessage', {
        ...messageData,
        isSender: true,
      });

      const socketsInRoom = await this.server.sockets
        .in(`conversation-${data.conversationId}`)
        .fetchSockets();

      for (const socketInRoom of socketsInRoom) {
        const receiver = socketInRoom.data.user as UserLoggedDto;

        if (receiver.sub === user.sub) {
          continue; // Ignora o remetente
        }

        const contentToSend = this.conversationMessageService.processMessage(message, receiver);

        socketInRoom.emit('newMessage', {
          ...messageData,
          content: contentToSend,
          isSender: false,
        });
      }

      if (user.role !== UserRole.ADMIN) {
        const plain =
          typeof message.content === 'string'
            ? message.content.replace(/<[^>]*>/g, '').trim()
            : '';
        this.server.to('admin-chat-alerts').emit('adminChatAlert', {
          conversationId: data.conversationId,
          preview: plain.length > 0 ? plain.slice(0, 160) : 'Nova mensagem',
        });
      }
    } catch (e) {
      Logger.error(e);
      throw new WsException('Não foi possivel enviar a mensagem.');
    }
  }

  @SubscribeMessage('markAsRead')
  async markAsRead(@ConnectedSocket() socket: Socket, @MessageBody() data: { messageId: number }) {
    const user = socket.data.user as UserLoggedDto;
    try {
      await this.markAsReadMessageUseCase.execute(data.messageId, user.sub);
    } catch (e) {
      Logger.error(e);
      throw new WsException('Erro ao marcar a mensagem como lida');
    }
  }

  @UseGuards(WsAuthGuard)
  @Roles(UserRole.ADMIN)
  @SubscribeMessage('editMessage')
  async editMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: number; messageId: number; newContent: string },
  ) {
    try {
      await this.editMessageUseCase.execute(data.messageId, data.newContent);

      const { content, status } = await this.approveOrRejectMessageUseCase.execute(
        data.messageId,
        true,
      );

      const conversationRoom = `conversation-${data.conversationId}`;

      socket.emit('editedMessage', {
        messageId: data.messageId,
        newContent: content,
        status,
      });

      socket.to(conversationRoom).emit('editedMessage', {
        messageId: data.messageId,
        newContent: content,
        status,
      });
    } catch (e) {
      Logger.error(e);
      throw new WsException('Erro ao editar a mensagem');
    }
  }

  @UseGuards(WsAuthGuard)
  @Roles(UserRole.ADMIN)
  @SubscribeMessage('markAsApproved')
  async markAsApproved(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: number; messageId: number; approved: boolean },
  ) {
    const user = socket.data.user as UserLoggedDto;
    try {
      const message = await this.approveOrRejectMessageUseCase.execute(
        data.messageId,
        data.approved,
      );

      const socketsInRoom = await this.server.sockets
        .in(`conversation-${data.conversationId}`)
        .fetchSockets();

      for (const socketInRoom of socketsInRoom) {
        const receiver = socketInRoom.data.user as UserLoggedDto;

        const contentToSend = this.conversationMessageService.processMessage(message, receiver);

        socketInRoom.emit('messageApproved', {
          messageId: data.messageId,
          status: message.status,
          revisedAt: new Date(),
          content: contentToSend,
        });
      }

    } catch (e) {
      Logger.error(e);
      throw new WsException('Erro ao aprovar/rejeitar a mensagem');
    }
  }
}
