import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { UserRole } from '@/User/entities/user.entity';
import { Body, Controller, Get, Param, ParseFloatPipe, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateStatusBusinessUseCase } from '../useCases/updateStatusBusiness.usecase';
import { BusinessStatus } from '../entities/business.entity';
import { ListBusinessForCooperativeUseCase } from '../useCases/listBusinessForCooperative.usecase';
import { ListBusinessForAdminUseCase } from '../useCases/listBusinessForAdmin.usecase';
import { ReadByIdBusinessUseCase } from '../useCases/readByIdBusiness.usecase';
import { ChangeValueBusinessUseCase } from '../useCases/changeValueBusiness.usecase';

@ApiBearerAuth()
@ApiTags('Business')
@Controller('business')
export class BusinessController {
  constructor(
    private readonly updateStatusBusinessUseCase: UpdateStatusBusinessUseCase,
    private readonly listBusinessForCooperativeUseCase: ListBusinessForCooperativeUseCase,
    private readonly listBusinessForAdminUseCase: ListBusinessForAdminUseCase,
    private readonly readByIdBusinessUseCase: ReadByIdBusinessUseCase,
    private readonly changeValueBusinessUseCase: ChangeValueBusinessUseCase,
  ) {}

  @Get('list')
  @Roles(UserRole.COOPERATIVE)
  @PaginatedSwagger({ filterableColumns: ['status', 'createdAt', 'type', 'operation'] })
  @ApiOperation({ summary: 'Listar Negocios (apenas cooperativa logada)' })
  async listForCooperative(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.listBusinessForCooperativeUseCase.execute(query, user.sub);
  }

  @Get('list-all')
  @Roles(UserRole.ADMIN)
  @PaginatedSwagger({ filterableColumns: ['status', 'createdAt', 'awaitingMediation'] })
  @ApiOperation({ summary: 'Listar Negocios (Apenas ADMIN)' })
  async listAll(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.listBusinessForAdminUseCase.execute(query, user);
  }

  @Patch(':id/mark-as-done')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Finalizar Negócio (Cooperativa ofertante ou ADMIN)' })
  async markAsDone(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.updateStatusBusinessUseCase.execute(id, BusinessStatus.Done, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ver Negócio (Cooperativa ofertante|Requisitante ou ADMIN)' })
  async readById(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.readByIdBusinessUseCase.execute(id, user);
  }

  @Patch(':id/update-value')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alterar Valor do Negócio (ADMIN)' })
  async updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Body('value', ParseFloatPipe) value: number,
  ) {
    return await this.changeValueBusinessUseCase.execute(id, value);
  }
}
