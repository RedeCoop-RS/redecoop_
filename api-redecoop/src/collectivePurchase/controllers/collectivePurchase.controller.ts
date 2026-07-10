import { Roles } from '@/_common/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { CreateCollectivePurchaseDto } from '../Dtos/createCollectivePurchase.dto';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { CreateCollectivePurchaseUseCase } from '../useCases/createCollectivePurchase.usecase';
import { StartTradingCollectivePurchaseUseCase } from '../useCases/startTradingCollectivePurchase.usecase';
import { UpdateCollectivePurchaseDto } from '../Dtos/updateCollectivePurchase.dto';
import { UpdateCollectivePurchaseUseCase } from '../useCases/updateCollectivePurchase.usecase';
import { GetCollectivePurchaseUseCase } from '../useCases/getCollectivePurchase.usecase';
import { ListCollectivePurchaseUseCase } from '../useCases/listCollectivePurchases.usecase';
import { UpdateCollectivePurchaseStatusUseCase } from '../useCases/updateCollectivePurchaseStatus.usecase';

@ApiBearerAuth()
@ApiTags('CollectivePurchase')
@Controller('collective-purchase')
export class CollectivePurchaseController {
  constructor(
    private readonly createCollectivePurchaseUseCase: CreateCollectivePurchaseUseCase,
    private readonly startTradingCollectivePurchaseUseCase: StartTradingCollectivePurchaseUseCase,
    private readonly updateCollectivePurchaseUseCase: UpdateCollectivePurchaseUseCase,
    private readonly getCollectivePurchaseUseCase: GetCollectivePurchaseUseCase,
    private readonly listCollectivePurchaseUseCase: ListCollectivePurchaseUseCase,
    private readonly updateCollectivePurchaseStatusUseCase: UpdateCollectivePurchaseStatusUseCase,
  ) {}

  @Post('create')
  @Roles(UserRole.ADMIN)
  async create(@Body() postData: CreateCollectivePurchaseDto, @UserLogged() user: UserLoggedDto) {
    return await this.createCollectivePurchaseUseCase.execute(postData, user);
  }

  @Put(':id/update')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateCollectivePurchaseDto,
  ) {
    await this.updateCollectivePurchaseUseCase.execute(id, postData);
  }

  @Get('list')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @PaginatedSwagger()
  async list(@Paginate() query: PaginateQuery) {
    return await this.listCollectivePurchaseUseCase.execute(query);
  }

  @Patch(':id/active')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('active', ParseBoolPipe) active: boolean,
  ) {
    await this.updateCollectivePurchaseStatusUseCase.execute(id, active);
  }

  @Post(':id/start-trading')
  @Roles(UserRole.COOPERATIVE)
  async startTrading(
    @Param('id', ParseIntPipe) id: number,
    @Body('initialMessage') initialMessage: string,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.startTradingCollectivePurchaseUseCase.execute(id, initialMessage, user);
  }

  @Get(':id/view')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  async view(@Param('id', ParseIntPipe) id: number) {
    return await this.getCollectivePurchaseUseCase.execute(id);
  }
}
