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
  UploadedFile,
} from '@nestjs/common';
import { UpdateEmailCooperativeDto } from '../Dtos/updateEmailCooperative.dto';
import { UpdatePasswordCooperativeDto } from '../Dtos/updatePasswordCooperative.dto';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CooperativeDto } from '../Dtos/cooperativeResponse.dto';
import { UserRole } from '@/User/entities/user.entity';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UpdateCooperativeUseCase } from '../useCases/updateCooperative.usecase';
import { UpdateEmailCooperativeLoginUseCase } from '../useCases/updateEmailLoginusecase';
import { UpdatePasswordCooperativeUseCase } from '../useCases/updatePasswordCooperative.usecase';
import { CreateCooperativeDto } from '../Dtos/cooperative.dto';
import { CreateCooperativeUseCase } from '../useCases/createCooperative.usecase';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { ApiOkResponsePaginated, Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { GetCooperativesUseCase } from '../useCases/getCooperatives.usecase';
import { ListCooperativesForSelectUseCase } from '../useCases/listCooperativesForSelect.usecase';
import { GetCooperativeSummaryUseCase } from '../useCases/getCooperativeSummary.usecase';
import { GetCooperativeUseCase } from '../useCases/getCooperative.usecase';
import { ListCooperativeProductsForSelectUseCase } from '../useCases/listCooperativeProductsForSelect.usecase';
import { UpdateCooperativeActiveStatusUseCase } from '../useCases/updateCooperativeUpdateActive.usecase';
import { ApiFile } from '@/_common/decorators/api-file.decorator';
import { fileMimetypeFilter } from '@/_common/utils/file-mimetype-filter';
import { UpdateCooperativeDto } from '../Dtos/updateCooperative.dto';
import { UpdateCooperativeProfileDto } from '../Dtos/updateCooperativeProfile.dto';
import { ChangeCoopPassByAdminUseCase } from '../useCases/changeCopPassByAdmin.usecase';
import { ChangeCooperativeByAdminDto } from '../Dtos/changePasswordCooperativeByAdmin.dto';

@ApiBearerAuth()
@ApiTags('Cooperative')
@Controller('cooperative')
export class CooperativeController {
  constructor(
    private readonly updateCooperativeUseCase: UpdateCooperativeUseCase,
    private readonly updateEmailCooperativeLoginUseCase: UpdateEmailCooperativeLoginUseCase,
    private readonly updatePasswordCooperativeUseCase: UpdatePasswordCooperativeUseCase,
    private readonly createCooperativeUseCase: CreateCooperativeUseCase,
    private readonly getCooperativesUseCase: GetCooperativesUseCase,
    private readonly listCooperativesForSelectUseCase: ListCooperativesForSelectUseCase,
    private readonly getCooperativeSummaryUseCase: GetCooperativeSummaryUseCase,
    private readonly getCooperativeUseCase: GetCooperativeUseCase,
    private readonly listCooperativeProductsForSelectUseCase: ListCooperativeProductsForSelectUseCase,
    private readonly updateCooperativeActiveStatusUseCase: UpdateCooperativeActiveStatusUseCase,
    private readonly changeCoopPassByAdminUseCase: ChangeCoopPassByAdminUseCase,
  ) {}

  @Get('list')
  @Roles(UserRole.ADMIN)
  @PaginatedSwagger()
  @ApiOperation({ summary: 'Listar as cooperativas (Apenas Admin)' })
  @ApiOkResponsePaginated(CooperativeDto)
  async list(@Paginate() query: PaginateQuery) {
    return await this.getCooperativesUseCase.execute(query);
  }

  @Get('view/:id')
  @Roles(UserRole.ADMIN)
  @ApiResponse({ type: CooperativeDto })
  @ApiOperation({ summary: 'Ver Cooperativa (Apenas Admin)' })
  async view(@Param('id', ParseIntPipe) id: number) {
    return await this.getCooperativeUseCase.execute(id);
  }

  @Post('create')
  @Roles(UserRole.ADMIN)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Criar Cooperativa (Apenas Admin)' })
  async create(@Body() postData: CreateCooperativeDto, @UploadedFile() img: Express.Multer.File) {
    return await this.createCooperativeUseCase.execute({ ...postData, img });
  }

  @Put('update/:id')
  @Roles(UserRole.ADMIN)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Atualizar Cooperativa (Apenas Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateCooperativeDto,
    @UploadedFile() img: Express.Multer.File,
  ) {
    await this.updateCooperativeUseCase.execute(id, { ...postData, img });
  }

  @Patch(':id/active')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar status cooperativa (Apenas Admin)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('active', ParseBoolPipe) active: boolean,
  ) {
    await this.updateCooperativeActiveStatusUseCase.execute(id, active);
  }

  @Post(':id/change-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alterar senha da cooperativa (Apenas Admin)' })
  async resendTokenRegister(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCooperativeByAdminDto,
  ) {
    await this.changeCoopPassByAdminUseCase.execute(id, dto.password);
  }

  @Put('update-profile')
  @Roles(UserRole.COOPERATIVE)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Atualizar perfil da cooperativa logada (Apenas Cooperativa)' })
  async updateProfile(
    @Body() postData: UpdateCooperativeProfileDto,
    @UploadedFile() img: Express.Multer.File,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.updateCooperativeUseCase.execute(user.sub, { ...postData, img });
  }

  @Get('view-profile')
  @Roles(UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ver perfil da cooperativa logada  (Apenas Cooperativa)' })
  @ApiResponse({ type: CooperativeDto })
  async viewProfile(@UserLogged() user: UserLoggedDto) {
    return await this.getCooperativeUseCase.execute(user.sub);
  }

  @Put('update-email')
  @Roles(UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Alterar E-mail cooperativa logada  (Apenas Cooperativa)' })
  async updateEmail(
    @Body() postData: UpdateEmailCooperativeDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.updateEmailCooperativeLoginUseCase.execute(user.sub, postData);
  }

  @Put('update-password')
  @Roles(UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Alterar senha cooperativa logada  (Apenas Cooperativa)' })
  async updatePassword(
    @Body() postData: UpdatePasswordCooperativeDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.updatePasswordCooperativeUseCase.execute(user.sub, postData);
  }

  @Get('select')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar cooperativas - selects e dropdows  (Todos os usuarios do dashboard)',
  })
  async listForSelect() {
    return await this.listCooperativesForSelectUseCase.execute();
  }

  @Get(':id/view-summary')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver Resumo Perfil Cooperativa (Todos os usuarios do dashboard)' })
  async viewSummaryProfile(@Param('id', ParseIntPipe) id: number) {
    return await this.getCooperativeSummaryUseCase.execute(id);
  }

  @Get(':id/select-products')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Ver Produtos da cooperativa por ID - selects e dropdows (Todos os usuarios do dashboard)',
  })
  async listProductsCooperative(@Param('id', ParseIntPipe) id: number) {
    return await this.listCooperativeProductsForSelectUseCase.execute(id);
  }
}
