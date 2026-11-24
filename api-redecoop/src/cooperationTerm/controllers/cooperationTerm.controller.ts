import { Roles } from '@/_common/decorators/role.decorator';
import { ApiFile } from '@/_common/decorators/api-file.decorator';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  SerializeOptions,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { actorFromUser } from '../cooperationTerm.actor';
import { CooperationTermService } from '../cooperationTerm.service';
import {
  CooperationTermItemDto,
  CreateCooperationTermDto,
  ReleaseDivisionDto,
  ReplaceHospitalUnitsDto,
  SendCooperationTermDto,
  SendDivisionDto,
  SetCalendarDto,
  SetCapacitiesDto,
  SetInterestsDto,
  UpdateCooperationTermDto,
} from '../Dtos/cooperationTerm.dto';

@ApiBearerAuth()
@ApiTags('CooperationTerm')
@SerializeOptions({ excludeExtraneousValues: false })
@Controller('cooperation-terms')
export class CooperationTermController {
  constructor(private readonly service: CooperationTermService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list(
    @UserLogged() user: UserLoggedDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('q') q?: string,
  ) {
    return this.service.list(actorFromUser(user), page, limit, q);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@UserLogged() user: UserLoggedDto, @Body() dto: CreateCooperationTermDto) {
    return this.service.create(actorFromUser(user), dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  get(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.get(actorFromUser(user), id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCooperationTermDto,
  ) {
    return this.service.update(actorFromUser(user), id, dto);
  }

  @Put(':id/hospital-units')
  @Roles(UserRole.ADMIN)
  replaceHospitalUnits(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceHospitalUnitsDto,
  ) {
    return this.service.replaceHospitalUnits(actorFromUser(user), id, dto.units);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN)
  createItem(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CooperationTermItemDto,
  ) {
    return this.service.createItem(actorFromUser(user), id, dto);
  }

  @Put(':id/items/:itemId')
  @Roles(UserRole.ADMIN)
  updateItem(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CooperationTermItemDto,
  ) {
    return this.service.updateItem(actorFromUser(user), id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN)
  deleteItem(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.service.deleteItem(actorFromUser(user), id, itemId);
  }

  @Post(':id/items/import/preview')
  @Roles(UserRole.ADMIN)
  @ApiFile('file')
  previewImport(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.previewImport(actorFromUser(user), id, file);
  }

  @Post(':id/items/import')
  @Roles(UserRole.ADMIN)
  @ApiFile('file')
  importItems(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Query('replace') replace?: string,
  ) {
    return this.service.importItems(
      actorFromUser(user),
      id,
      file,
      replace === 'true' || replace === '1',
    );
  }

  @Put(':id/interests')
  @Roles(UserRole.ADMIN)
  setInterests(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetInterestsDto,
  ) {
    return this.service.setInterests(actorFromUser(user), id, dto.items);
  }

  @Put(':id/capacities')
  @Roles(UserRole.ADMIN)
  setCapacities(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCapacitiesDto,
  ) {
    return this.service.setCapacities(actorFromUser(user), id, dto.entries);
  }

  @Post(':id/recalculate')
  @Roles(UserRole.ADMIN)
  recalculate(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.recalculate(actorFromUser(user), id);
  }

  @Put(':id/division-release')
  @Roles(UserRole.ADMIN)
  setDivisionReleased(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReleaseDivisionDto,
  ) {
    return this.service.setDivisionReleased(actorFromUser(user), id, dto.released);
  }

  @Put(':id/calendar')
  @Roles(UserRole.ADMIN)
  setCalendar(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCalendarDto,
  ) {
    return this.service.setCalendar(actorFromUser(user), id, dto.entries);
  }

  @Post(':id/sign')
  @Roles(UserRole.ADMIN)
  sign(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.sign(actorFromUser(user), id);
  }

  @Post(':id/new-version')
  @Roles(UserRole.ADMIN)
  newVersion(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.newVersion(actorFromUser(user), id);
  }

  @Post(':id/send')
  @Roles(UserRole.ADMIN)
  send(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendCooperationTermDto,
  ) {
    return this.service.send(actorFromUser(user), id, dto.confirm, dto.message);
  }

  @Post(':id/send-division')
  @Roles(UserRole.ADMIN)
  sendDivision(
    @UserLogged() user: UserLoggedDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendDivisionDto,
  ) {
    return this.service.sendDivision(actorFromUser(user), id, dto.confirm, dto.message);
  }

  @Get(':id/export/division/excel')
  @Roles(UserRole.ADMIN)
  exportDivisionExcel(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.exportDivision(actorFromUser(user), id, 'excel');
  }

  @Get(':id/export/division/pdf')
  @Roles(UserRole.ADMIN)
  exportDivisionPdf(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.exportDivision(actorFromUser(user), id, 'pdf');
  }

  @Get(':id/export/excel')
  @Roles(UserRole.ADMIN)
  exportExcel(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.exportExcel(actorFromUser(user), id);
  }

  @Get(':id/export/pdf')
  @Roles(UserRole.ADMIN)
  exportPdf(@UserLogged() user: UserLoggedDto, @Param('id', ParseIntPipe) id: number) {
    return this.service.exportPdf(actorFromUser(user), id);
  }
}
