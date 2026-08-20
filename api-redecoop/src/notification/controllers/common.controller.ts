import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { Controller, Delete, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationService } from '../notification.service';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';

@ApiBearerAuth()
@ApiTags('Notification')
@Controller('common/notification')
@Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
export class CommonNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('list')
  @PaginatedSwagger()
  async list(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.notificationService.findAll(query, user);
  }

  @Get('count-unread')
  async countUnread(@UserLogged() user: UserLoggedDto) {
    return await this.notificationService.countNotificationUnread(user);
  }

  @Put('mark-as-read/:id')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.notificationService.markAsRead(id, user);
  }

  @Delete('delete/:id')
  async dismiss(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.notificationService.dismiss(id, user);
  }
}
