import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { CommonNotificationController } from './controllers/common.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [CommonNotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [TypeOrmModule, NotificationService, NotificationGateway],
})
export class NotificationModule {}
