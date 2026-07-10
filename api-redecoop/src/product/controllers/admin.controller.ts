import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { ProductService } from '../product.service';
import { CreateProductDto, UpdateProductDto } from '../Dtos/productCreate.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import multerConfig from '@/_common/config/multer.config';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductDto } from '../Dtos/product.dto';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { CategoryTotalDto } from '../Dtos/productCategoryTotal.dto';
import { UserRole } from '@/User/entities/user.entity';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { ApiFile } from '@/_common/decorators/api-file.decorator';
import { fileMimetypeFilter } from '@/_common/utils/file-mimetype-filter';
@ApiBearerAuth()
@ApiTags('Product')
@Controller('root/product')
@Roles(UserRole.ADMIN)
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Criar Produto' })
  async create(@Body() postData: CreateProductDto, @UploadedFile() img: Express.Multer.File) {
    await this.productService.createProduct({ ...postData, img });
  }

  @Put('update/:id')
  @ApiFile('img', { fileFilter: fileMimetypeFilter('image/png', 'image/jpeg') })
  @ApiOperation({ summary: 'Atualizar Produto' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() postData: UpdateProductDto,
    @UploadedFile() img: Express.Multer.File,
  ) {
    await this.productService.updateProduct({ ...postData, img }, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar Produto' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.productService.deleteProduct(id);
  }

  @Get('show/:id')
  @ApiOperation({ summary: 'Ver Produto' })
  @ApiResponse({ type: ProductDto })
  async show(@Param('id', ParseIntPipe) id: number): Promise<ProductDto> {
    return await this.productService.findById(id);
  }

  @Get('list')
  @PaginatedSwagger({
    filterableColumns: ['typeId', 'categoryId', 'name'],
  })
  @ApiOperation({ summary: 'Listar todos os produtos' })
  @ApiResponse({ type: ProductDto, isArray: true })
  async list(@Paginate() query: PaginateQuery) {
    return await this.productService.findAll(query);
  }

  @Get('count-by-category')
  @ApiOperation({ summary: 'Total de produtos por categoria' })
  @ApiResponse({ type: CategoryTotalDto })
  async countByCategory(
    @Query('filter.typeId') filterTypeId?: string,
    @Query('filter.name') filterName?: string,
  ) {
    return await this.productService.countProductsByCategory({
      typeId: filterTypeId,
      name: filterName,
    });
  }
}
