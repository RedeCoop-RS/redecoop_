import { Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { NotificationDto } from './Dtos/notification.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async findAll(
    query: PaginateQuery,
    userLogged: UserLoggedDto,
  ): Promise<Paginated<NotificationDto>> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.cooperative', 'cooperative')
      .where('cooperative.id = :cooperativeId', { cooperativeId: userLogged.sub })
      .orderBy('notification.createdAt', 'DESC');

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformData = plainToInstance(NotificationDto, data);

    return { data: transformData, ...pagination } as Paginated<NotificationDto>;
  }

  async countNotificationUnread(userLogged: UserLoggedDto): Promise<number> {
    const totalUnread = await this.notificationRepository.count({
      where: { cooperative: { id: userLogged.sub }, isRead: false },
    });

    return totalUnread;
  }

  async markAsRead(notificationId: number): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        isRead: true,
      },
    );
  }

  async sendNotification(type: NotificationType, content: string, cooperativeId: number) {
    const notification = await this.saveNotification(type, content, cooperativeId);
    const transformData = plainToInstance(NotificationDto, notification);
    this.notificationGateway.sendNotification(cooperativeId, transformData);
  }

  private async saveNotification(
    type: NotificationType,
    message: string,
    cooperativeId: number,
  ): Promise<Notification> {
    const newNotification = this.notificationRepository.create({
      message,
      cooperative: { id: cooperativeId },
      type: type,
    });

    return await this.notificationRepository.save(newNotification);
  }
}
