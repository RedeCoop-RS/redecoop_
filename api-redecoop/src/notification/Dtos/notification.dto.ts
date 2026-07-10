import { Expose } from 'class-transformer';
import { NotificationType } from '../entities/notification.entity';

export class NotificationDto {
  @Expose()
  id: number;
  @Expose()
  message: string;
  @Expose()
  createdAt: Date;
  @Expose()
  isRead: boolean;
  @Expose()
  type: NotificationType
}
