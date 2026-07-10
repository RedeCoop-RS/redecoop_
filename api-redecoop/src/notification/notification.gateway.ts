import {
  ClassSerializerInterceptor,
  forwardRef,
  Inject,
  Injectable,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';
import { WsAuthGuard } from '@/_common/guards/wsAuth.guard';
import { UserRole } from '@/User/entities/user.entity';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { Notification } from './entities/notification.entity';
import { NotificationDto } from './Dtos/notification.dto';

@WebSocketGateway({ cors: true })
@UseInterceptors(ClassSerializerInterceptor)
export class NotificationGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private connectedCooperatives: Map<number, Socket> = new Map();

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  handleDisconnect(socket: Socket) {
    this.connectedCooperatives.forEach((s, cooperativeId) => {
      if (s.id === socket.id) {
        this.connectedCooperatives.delete(cooperativeId);
      }
    });
  }

  @UseGuards(WsAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @SubscribeMessage('listenNotification')
  listenNotification(@ConnectedSocket() socket: Socket) {
    const user = socket.data.user as UserLoggedDto;
    this.connectedCooperatives.set(user.sub, socket);
  }

  sendNotification(cooperativeId: number, notification: NotificationDto) {
    const socket = this.connectedCooperatives.get(cooperativeId);
    if (socket) {
      this.server.to(socket.id).emit('notification', notification);
    }
  }
}
