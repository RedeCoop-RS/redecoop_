import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SerializeOptions } from '@nestjs/common';
import { CafService } from './caf.service';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('CAF')
@Controller('caf')
@SerializeOptions({ excludeExtraneousValues: false })
export class CafController {
  constructor(private readonly cafService: CafService) {}

  @Get('panel')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  async panel(
    @UserLogged() user: UserLoggedDto,
    @Query('cooperativeId') cooperativeId?: string,
  ) {
    if (user.role === UserRole.COOPERATIVE) {
      return this.cafService.getPanel(user.sub);
    }
    return this.cafService.getPanel(cooperativeId ? Number(cooperativeId) : undefined);
  }
}
