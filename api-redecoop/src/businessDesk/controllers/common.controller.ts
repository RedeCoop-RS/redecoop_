import { Roles } from '@/_common/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { BusinessDeskService } from '../businessDesk.service';
import { UpdateBusinessDeskDto } from '../Dtos/updateBusinessDesk.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { UpdateOpportunityActiveStatusUseCase } from '../useCases/updateOpportunityActiveStatus.usecase';
@ApiBearerAuth()
@ApiTags('BusinessDesk')
@Controller('common/business-desk')
@Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
export class CommonBusinessDeskController {
  constructor(
    private readonly businessDeskService: BusinessDeskService,
    private readonly updateOpportunityActiveStatusUseCase: UpdateOpportunityActiveStatusUseCase,
  ) {}

  @Get('list')
  async list(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.businessDeskService.findAll(query, user);
  }

  @Get('view/:id')
  async view(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.businessDeskService.findById(id, user);
  }

  @Put('update/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateBusinessDeskDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.businessDeskService.update(id, postData, user);
  }

  @Patch(':id/active')
  async active(
    @Param('id', ParseIntPipe) id: number,
    @Body('active', ParseBoolPipe) active: boolean,
  ) {
    await this.updateOpportunityActiveStatusUseCase.execute(id, active);
  }
}
