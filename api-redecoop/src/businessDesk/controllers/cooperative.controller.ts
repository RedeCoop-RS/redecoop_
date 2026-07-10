import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { BusinessDeskService } from '../businessDesk.service';
import { CreateBusinessDeskDto } from '../Dtos/createBusinessDesk.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { StartContactBusinessDeskDto } from '../Dtos/startContactBusinessDesk.dto';
@ApiBearerAuth()
@ApiTags('BusinessDesk')
@Controller('cooperative/business-desk')
@Roles(UserRole.COOPERATIVE)
export class CooperativeBusinessDeskController {
  constructor(private readonly businessDeskService: BusinessDeskService) {}

  @Post('create')
  async create(@Body() postData: CreateBusinessDeskDto, @UserLogged() user: UserLoggedDto) {
    return await this.businessDeskService.create(postData, user.sub);
  }

  @Post('start-contact')
  async startContact(
    @Body() postData: StartContactBusinessDeskDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.businessDeskService.startContact(postData, user.sub);
  }
}
