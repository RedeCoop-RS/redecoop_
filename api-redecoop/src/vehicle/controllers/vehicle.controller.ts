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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import multerConfig from '@/_common/config/multer.config';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateVehicleDto } from '../Dtos/createVehicle.dto';
import { UpdateVehicleDto } from '../Dtos/updateVehicle.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { VehicleResponseDto } from '../Dtos/vehicleRespose.dto';
import { UserRole } from '@/User/entities/user.entity';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { CreateVehicleUseCase } from '../useCases/createVehicle.usecase';
import { UpdateVehicleUseCase } from '../useCases/updateVehicle.usecase';
import { ListVehiclesUseCase } from '../useCases/listVehicles.usecase';
import { GetVehiclesUseCase } from '../useCases/getVehicle.usecase';
import { UpdateVehicleActiveUseCase } from '../useCases/updateVehicleActive.usecase';
import { ListVehiclesForSelectUseCase } from '../useCases/listVehiclesForSelect.usecase';
import { fileMimetypeFilter } from '@/_common/utils/file-mimetype-filter';
import { ApiFile } from '@/_common/decorators/api-file.decorator';

@ApiBearerAuth()
@ApiTags('Vehicle')
@Controller('vehicle')
export class VehicleController {
  constructor(
    private readonly createVehicleUseCase: CreateVehicleUseCase,
    private readonly updateVehicleUseCase: UpdateVehicleUseCase,
    private readonly listVehiclesUseCase: ListVehiclesUseCase,
    private readonly getVehiclesUseCase: GetVehiclesUseCase,
    private readonly updateVehicleActiveUseCase: UpdateVehicleActiveUseCase,
    private readonly listVehiclesForSelectUseCase: ListVehiclesForSelectUseCase,
  ) {}

  @Post('create')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Criar Veiculo' })
  async create(
    @Body() postData: CreateVehicleDto,
    @UploadedFile() file: Express.Multer.File,
    @UserLogged() user: UserLoggedDto,
  ) {
    const { cooperativeId } = postData;
    postData.cooperativeId = user.role === UserRole.ADMIN ? cooperativeId : user.sub;
    postData.img = file?.filename;
    return await this.createVehicleUseCase.execute(postData);
  }

  @Put('update/:id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Atualizar Veiculo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateVehicleDto,
    @UploadedFile() file: Express.Multer.File,
    @UserLogged() user: UserLoggedDto,
  ) {
    postData.img = file?.filename;
    await this.updateVehicleUseCase.execute(postData, id, user);
  }

  @Get('list')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @PaginatedSwagger({ filterableColumns: ['cooperativeId'] })
  @ApiOperation({ summary: 'Listar Veiculos' })
  @ApiResponse({ type: VehicleResponseDto, isArray: true })
  async list(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.listVehiclesUseCase.execute(query, user);
  }

  @Get('view/:id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ver Veiculo' })
  @ApiResponse({ type: VehicleResponseDto })
  async view(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.getVehiclesUseCase.execute(id, user);
  }

  @Patch(':id/active')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Atualizar status do veiculo (Apenas Admin e cooperativa responsavel)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('active', ParseBoolPipe) active: boolean,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.updateVehicleActiveUseCase.execute(id, active, user);
  }

  @Get('select')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiQuery({
    name: 'cooperativeId',
    required: false,
    description: 'Admin deve passar para retornar os veiculos de uma cooperativa especifica',
  })
  @ApiOperation({
    summary: 'Listar Veículos - Selects e Dropdows (Apenas Admin e cooperativa responsavel)',
  })
  async listForSelect(
    @UserLogged() user: UserLoggedDto,
    @Query('filter.cooperativeId', ParseIntPipe) cooperativeId: number,
  ) {
    return await this.listVehiclesForSelectUseCase.execute(user, cooperativeId);
  }
}
