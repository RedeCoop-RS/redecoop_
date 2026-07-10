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
import { FileInterceptor } from '@nestjs/platform-express';
import multerConfig from '@/_common/config/multer.config';
import { CreateDriverDto } from '../Dtos/createDriver.dto';
import { UpdateDriverDto } from '../Dtos/updateDriver.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { DriverResponseDto } from '../Dtos/driverResponse.dto';
import { UserRole } from '@/User/entities/user.entity';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { ListDriversUseCase } from '../useCases/listDrivers.usecase';
import { UpdateDriversUseCase } from '../useCases/updateDriver.usecase';
import { DriverService } from '../services/driver.service';
import { CreateDriversUseCase } from '../useCases/createDriver.usecase';
import { GetDriversUseCase } from '../useCases/getDriver.usecase';
import { StartTravelUseCase } from '../useCases/startTravel.usecase';
import { TravelDto } from '@/travel/Dtos/travel.dto';
import { ListTravelsUseCase } from '../useCases/listTravels.usecase';
import { AttachFileToRouteUseCase } from '../useCases/attachFileToRoute.usecase';
import { attachInRouteDto } from '../Dtos/attachInRoute.dto';
import { MarkArrivalRouteUseCase } from '../useCases/markArrivalRoute.usecase';
import { CountCompletedTripsUseCase } from '../useCases/countCompletedTravels.usecase';
import { UpdateDriverActiveUseCase } from '../useCases/updateDriverActive.usecase';
import { ListDriversForSelectUseCase } from '../useCases/listDriversForSelect.usecase';
import { ApiFile } from '@/_common/decorators/api-file.decorator';
import { fileMimetypeFilter } from '@/_common/utils/file-mimetype-filter';

@ApiBearerAuth()
@ApiTags('Driver')
@Controller('driver')
export class DriverController {
  constructor(
    private readonly listDriversUseCase: ListDriversUseCase,
    private readonly updateDriversUseCase: UpdateDriversUseCase,
    private readonly createDriversUseCase: CreateDriversUseCase,
    private readonly getDriverUseCase: GetDriversUseCase,
    private readonly startTravelUseCase: StartTravelUseCase,
    private readonly driverService: DriverService,
    private readonly listTravelsUseCase: ListTravelsUseCase,
    private readonly attachFileToRouteUseCase: AttachFileToRouteUseCase,
    private readonly markArrivalRouteUseCase: MarkArrivalRouteUseCase,
    private readonly countCompletedTripsUseCase: CountCompletedTripsUseCase,
    private readonly updateDriverActiveUseCase: UpdateDriverActiveUseCase,
    private readonly listDriversForSelectUseCase: ListDriversForSelectUseCase,
  ) {}

  @Post('create')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Criar Motorista' })
  async create(
    @Body() postData: CreateDriverDto,
    @UploadedFile() img: Express.Multer.File,
    @UserLogged() user: UserLoggedDto,
  ) {
    const { cooperativeId } = postData;
    postData.cooperativeId = user.role === UserRole.ADMIN ? cooperativeId : user.sub;
    postData.img = img?.filename;
    await this.createDriversUseCase.execute(postData);
  }

  @Put('update/:id')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Atualizar Motorista' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateDriverDto,
    @UploadedFile() file: Express.Multer.File,
    @UserLogged() user: UserLoggedDto,
  ) {
    postData.img = file?.filename;
    await this.updateDriversUseCase.execute(id, postData, user);
  }

  @Patch(':id/active')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({
    summary: 'Atualizar status do Motorista (Apenas Admin e cooperativa responsavel)',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('active', ParseBoolPipe) active: boolean,
    @UserLogged() user: UserLoggedDto,
  ) {
    await this.updateDriverActiveUseCase.execute(id, active, user);
  }

  @Get('list')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @PaginatedSwagger({ filterableColumns: ['cooperativeId'] })
  @ApiOperation({ summary: 'Listar Motoristas' })
  @ApiResponse({ type: DriverResponseDto, isArray: true })
  async listAll(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.listDriversUseCase.execute(user, query);
  }

  @Get('select')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar Motoristas - Selects e Dropdows (Apenas Admin e cooperativa responsavel)',
  })
  @ApiQuery({
    name: 'cooperativeId',
    required: false,
    description: 'Admin deve passar para retornar os motoristas de uma cooperativa especifica',
  })
  async listForSelect(
    @UserLogged() user: UserLoggedDto,
    @Query('filter.cooperativeId', ParseIntPipe) cooperativeId: number,
  ) {
    return await this.listDriversForSelectUseCase.execute(user, cooperativeId);
  }

  @Get('view/:id')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver Motorista' })
  @ApiResponse({ type: DriverResponseDto })
  async view(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.getDriverUseCase.execute(id, user);
  }

  @Get('categories-cnh')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todas as categorias de CNH' })
  async listAllCategorysCNH() {
    return this.driverService.findAllCategoriesCNH();
  }

  @Get('types-blood')
  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todas os tipos de sangue' })
  async listAllTypesBlood() {
    return this.driverService.findAllTypeBlood();
  }

  @Post('start-travel/:travelId')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Iniciar Viagem destinada ao motorista' })
  async startTravel(
    @Param('travelId', ParseIntPipe) id: number,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.startTravelUseCase.execute(id, user);
  }

  @Get('my-travels')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Listar todas as viagens atribuídas ao motorista' })
  @ApiResponse({ type: TravelDto, isArray: true })
  async findTravels(@UserLogged() user: UserLoggedDto): Promise<TravelDto[]> {
    return await this.listTravelsUseCase.execute(user);
  }

  @Post('attach-in-route/:travelRouteId')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Anexar arquivo na rota (PDF, imagem e etc)' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: attachInRouteDto })
  async attachInRoute(
    @Param('travelRouteId', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.attachFileToRouteUseCase.execute(id, user, file);
  }

  @Post('mark-arrival-route/:travelRouteId')
  @Roles(UserRole.DRIVER)
  @ApiOperation({
    summary: 'Registra a chegada do motorista em uma rota específica',
  })
  async markArrival(
    @Param('travelRouteId', ParseIntPipe) id: number,
    @UserLogged() user: UserLoggedDto,
  ): Promise<void> {
    return await this.markArrivalRouteUseCase.execute(id, user);
  }

  @Get('total-travels-finished')
  @Roles(UserRole.DRIVER)
  @ApiOperation({
    summary: 'Total de todas as viagens finalizadas executadas pelo motorista',
  })
  @ApiBody({ type: Number })
  async totalTravels(@UserLogged() user: UserLoggedDto): Promise<number> {
    return await this.countCompletedTripsUseCase.execute(user.sub);
  }
}
