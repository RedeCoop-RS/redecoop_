import { Roles } from '@/_common/decorators/role.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  Delete,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { TravelDto } from '../Dtos/travel.dto';
import { CreateTravelDto } from '../Dtos/createTravel.dto';
import { UpdateTravelDto } from '../Dtos/updateTravel.dto';
import { TravelRouteDto } from '../Dtos/travelRoute.dto';
import { AdjustRouteOrder } from '../Dtos/adjustOrderTravelRoute.dto';

import { TravelRouteService } from '../services/travelRoute.service';

import { UserRole } from '@/User/entities/user.entity';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';

import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { ApiOkResponsePaginated, Paginate } from '@/_common/utils/paginate/decorator';
import { Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';

import { CreateTravelUseCase } from '../useCases/createTravel.usecase';
import { UpdateTravelUseCase } from '../useCases/updateTravel.usecase';
import { GetAvailableTravelUseCase } from '../useCases/getAvailableTravels.usecase';
import { GetMyTravelsUseCase } from '../useCases/getMyTravels.usecase';
import { GetTravelUseCase } from '../useCases/getTravel.usecase';
import { GetTravelWithOffersUseCase } from '../useCases/getTravelWithOffers.usecase';
import { GetTravelsUseCase } from '../useCases/getTravels.usecase';
import { DeleteTravelUseCase } from '../useCases/deleteTravel.usecase';
import { FinalizeTravelUseCase } from '../useCases/finalizeTravel.usecase';
import { FinalizeTravelDto } from '../Dtos/finalizeTravel.dto';

import { AttachFileToRouteCooperativeUseCase } from '../useCases/attachFileToRouteCooperative.usecase';

import { FileInterceptor } from '@nestjs/platform-express';
import multerConfig from '@/_common/config/multer.config';

@ApiBearerAuth()
@ApiTags('Travel')
@Controller('travel')
export class CommonTravelController {
  constructor(
    private readonly travelRouteService: TravelRouteService,
    private readonly createTravelUseCase: CreateTravelUseCase,
    private readonly updateTravelUseCase: UpdateTravelUseCase,
    private readonly getAvailableTravelUseCase: GetAvailableTravelUseCase,
    private readonly getMyTravelsUseCase: GetMyTravelsUseCase,
    private readonly getTravelUseCase: GetTravelUseCase,
    private readonly getTravelWithOffersUseCase: GetTravelWithOffersUseCase,
    private readonly getTravelsUseCase: GetTravelsUseCase,
    private readonly attachFileToRouteCooperativeUseCase: AttachFileToRouteCooperativeUseCase,
    private readonly deleteTravelUseCase: DeleteTravelUseCase, // ✅ ADICIONADO
    private readonly finalizeTravelUseCase: FinalizeTravelUseCase,
  ) {}

  @Post('create')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Criar viagem' })
  async create(@Body() postData: CreateTravelDto, @UserLogged() user: UserLoggedDto) {
    postData.cooperativeId = user.role == 'ADMIN' ? postData.cooperativeId : user.sub;
    return await this.createTravelUseCase.execute(postData);
  }

  @Patch(':id/update')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Atualizar viagem - total ou parcialmente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateTravelDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.updateTravelUseCase.execute(id, postData, user);
  }

  @Get('available-travels')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Viagens disponiveis para receber ofertas' })
  @PaginatedSwagger({
    filterableColumns: ['startDateTime', 'vehicleTypeId', 'status'],
  })
  @ApiResponse({ type: TravelDto, isArray: true })
  async availableTravels(
    @Paginate() query: PaginateQuery,
    @UserLogged() user: UserLoggedDto,
  ): Promise<Paginated<TravelDto>> {
    return this.getAvailableTravelUseCase.execute(query, user);
  }

  @Patch(':id/finalize')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Finalizar viagem (admin)' })
  async finalize(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: FinalizeTravelDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.finalizeTravelUseCase.execute(id, postData, user);
  }

  @Get('view/:id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ver Viagem' })
  @ApiResponse({ type: TravelDto })
  async view(@Param('id', ParseIntPipe) id: number) {
    return this.getTravelUseCase.execute(id);
  }

  @Get(':id/offers-travel')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ver viagem com oferta enviada' })
  @ApiResponse({ type: TravelDto })
  async findOneTravelWithOffers(
    @Param('id', ParseIntPipe) id: number,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.getTravelWithOffersUseCase.execute(id, user);
  }

  @Get('final-routes-with-proposal/:id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ver rotas originais e propostas de uma viagem' })
  @ApiResponse({ type: TravelRouteDto, isArray: true })
  async finalRoutesWithProposal(@Param('id', ParseIntPipe) id: number) {
    return await this.travelRouteService.finalRoutesWithProposal(id);
  }

  @Put('adjust-route-order/:id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Ajustar as rotas da viagem' })
  async adjustRouteOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: AdjustRouteOrder[],
  ) {
    return await this.travelRouteService.adjustRouteOrder(id, updateData);
  }

  @Post('attach-file-route/:routeId')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Anexar arquivo na rota' })
  async attachFileRoute(
    @Param('routeId', ParseIntPipe) id: number,
    @UserLogged() user: UserLoggedDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.attachFileToRouteCooperativeUseCase.execute(id, user, file);
  }

  @Get('my-travels')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Todas as viagens da cooperativa logada' })
  @PaginatedSwagger({ filterableColumns: ['startDateTime', 'type', 'status', 'notfinished'] })
  @ApiOkResponsePaginated(TravelDto)
  async myTravels(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    return await this.getMyTravelsUseCase.execute(query, user);
  }

  @Get('list')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Todas as viagens cadastradas no sistema' })
  @PaginatedSwagger({ filterableColumns: ['startDateTime', 'status', 'notfinished'] })
  @ApiOkResponsePaginated(TravelDto)
  async list(@Paginate() query: PaginateQuery) {
    return await this.getTravelsUseCase.execute(query);
  }

  // ✅ SOFT DELETE
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  @ApiOperation({ summary: 'Deletar viagem (soft delete)' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.deleteTravelUseCase.execute(id, user);
  }
}