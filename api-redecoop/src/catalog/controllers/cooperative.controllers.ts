import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
} from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { CatalogService } from '../services/catalog.service';
import { CreateCatalogDto } from '../Dtos/createCatalog.dto';
import { UpdateCatalogDto } from '../Dtos/updateCatalog';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { ApiFile } from '@/_common/decorators/api-file.decorator';
import { fileMimetypeFilter } from '@/_common/utils/file-mimetype-filter';

@ApiBearerAuth()
@ApiTags('Catalog')
@Controller('cooperative/catalog')
@Roles(UserRole.COOPERATIVE)
export class CooperativeCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('custom-image')
  @ApiOperation({
    summary: 'Enviar foto específica da cooperativa para o catálogo (marca própria)',
  })
  @ApiFile('file', {
    fileFilter: fileMimetypeFilter('image/png', 'image/jpeg', 'image/jpg', 'image/webp'),
  })
  async uploadCatalogCustomImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.filename) {
      throw new BadRequestException('Envie uma imagem no campo file');
    }
    return { filename: file.filename };
  }

  @Post('create')
  @ApiOperation({
    summary: 'Adicionar um produto da lista de produtos no catalogo da cooperativa',
  })
  async create(@Body() postData: CreateCatalogDto, @UserLogged() user: UserLoggedDto) {
    const cooperativeId = await this.catalogService.resolveCooperativeId(user);
    const data = {
      cooperativeId,
      ...postData,
    };
    return await this.catalogService.create(data);
  }

  @Get('list')
  @ApiOperation({
    summary: 'Listar todos os produtos no catalogo da cooperativa',
  })
  @PaginatedSwagger({
    filterableColumns: ['categoryId', 'typeId', 'name'],
  })
  async list(@Paginate() query: PaginateQuery, @UserLogged() user: UserLoggedDto) {
    const cooperativeId = await this.catalogService.resolveCooperativeId(user);
    return await this.catalogService.findAllByCooperative(query, cooperativeId);
  }

  @ApiOperation({
    summary: 'Ver produto no catalogo pelo ID',
  })
  @Get('view/:id')
  async find(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    const cooperativeId = await this.catalogService.resolveCooperativeId(user);
    return await this.catalogService.findByIdAndCooperative(id, cooperativeId);
  }

  @ApiOperation({
    summary: 'Atualizar um produto da lista de produtos no catalogo da cooperativa',
  })
  @Put('update/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateCatalogDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    const cooperativeId = await this.catalogService.resolveCooperativeId(user);
    await this.catalogService.update(id, {
      cooperativeOwnerId: cooperativeId,
      ...postData,
    });
  }

  @Get('count-by-category')
  async countByCategory(
    @UserLogged() user: UserLoggedDto,
    @Query('filter.typeId') filterTypeId?: string,
    @Query('filter.name') filterName?: string,
  ) {
    const cooperativeId = await this.catalogService.resolveCooperativeId(user);
    return await this.catalogService.countByCategory(cooperativeId, {
      typeId: filterTypeId,
      name: filterName,
    });
  }

  @Delete('remove-item/:id')
  async removeProductFromCatalog(
    @Param('id', ParseIntPipe) id: number,
    @UserLogged() user: UserLoggedDto,
  ) {
    const cooperativeId = await this.catalogService.resolveCooperativeId(user);
    await this.catalogService.removeProductFromCatalog(id, cooperativeId);
  }
}
