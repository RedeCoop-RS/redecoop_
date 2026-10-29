import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BlogUploadExceptionFilter, blogMulterOptions } from './blog.upload';
import { BlogService } from './blog.service';
import {
  BlogActionDto,
  BlogResourceDto,
  BulkBlogDto,
  ListBlogDto,
  SaveBlogPostDto,
  SaveBlogTagDto,
  SaveGhostConnectionDto,
  TestGhostConnectionDto,
} from './dto/blog.dto';
import { BlogSuperAdminGuard } from './security/blog-super-admin.guard';

interface AuthRequest extends Request {
  user?: { role?: string; userId?: number; sub?: number };
}

@ApiBearerAuth()
@ApiTags('Blog')
/**
 * Sem @Roles de propósito: o AuthGuard global só autentica (401 sem token) e o
 * BlogSuperAdminGuard devolve 403 para quem não é ADMIN. Com @Roles o guard
 * global responderia 401 e o painel trataria como sessão expirada.
 */
@Controller('root/blog')
@UseGuards(BlogSuperAdminGuard)
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get('connection')
  @ApiOperation({ summary: 'Status da conexão com o Ghost (sem a chave)' })
  connection() {
    return this.blog.connection();
  }

  @Put('connection')
  @ApiOperation({ summary: 'Salvar URL e Admin API key cifrada' })
  saveConnection(@Req() req: AuthRequest, @Body() dto: SaveGhostConnectionDto) {
    return this.blog.saveConnection(this.userId(req), dto);
  }

  @Delete('connection')
  @ApiOperation({ summary: 'Apagar a conexão salva (variáveis de ambiente continuam valendo)' })
  deleteConnection() {
    return this.blog.deleteConnection();
  }

  @Post('connection/test')
  @ApiOperation({ summary: 'Testar o Ghost sem gravar' })
  test(@Body() dto: TestGhostConnectionDto) {
    return this.blog.testConnection(dto);
  }

  @Get('posts')
  posts(@Query() query: ListBlogDto) {
    return this.blog.list(query);
  }

  @Post('posts/bulk')
  @ApiOperation({ summary: 'Publicar, derrubar, destacar ou excluir vários itens' })
  bulk(@Body() dto: BulkBlogDto) {
    return this.blog.bulk(dto);
  }

  @Post('posts')
  create(@Body() dto: SaveBlogPostDto) {
    return this.blog.create(dto);
  }

  @Get('posts/:id')
  read(@Param('id') id: string, @Query() query: BlogResourceDto) {
    return this.blog.read(id, query.resource);
  }

  @Put('posts/:id')
  update(@Param('id') id: string, @Body() dto: SaveBlogPostDto) {
    return this.blog.update(id, dto);
  }

  @Delete('posts/:id')
  remove(@Param('id') id: string, @Query() query: BlogResourceDto) {
    return this.blog.remove(id, query.resource);
  }

  @Post('posts/:id/publish')
  @ApiOperation({ summary: 'Subir (publicar). Data futura vira agendamento.' })
  publish(@Param('id') id: string, @Body() dto: BlogActionDto) {
    return this.blog.publish(id, dto);
  }

  @Post('posts/:id/unpublish')
  @ApiOperation({ summary: 'Derrubar (voltar para rascunho)' })
  unpublish(@Param('id') id: string, @Body() dto: BlogActionDto) {
    return this.blog.unpublish(id, dto);
  }

  @Post('posts/:id/schedule')
  schedule(@Param('id') id: string, @Body() dto: BlogActionDto) {
    return this.blog.schedule(id, dto);
  }

  @Post('posts/:id/duplicate')
  duplicate(@Param('id') id: string, @Body() dto: BlogResourceDto) {
    return this.blog.duplicate(id, dto.resource);
  }

  @Get('tags')
  tags() {
    return this.blog.tags();
  }

  @Post('tags')
  createTag(@Body() dto: SaveBlogTagDto) {
    return this.blog.createTag(dto);
  }

  @Put('tags/:id')
  updateTag(@Param('id') id: string, @Body() dto: SaveBlogTagDto) {
    return this.blog.updateTag(id, dto);
  }

  @Delete('tags/:id')
  deleteTag(@Param('id') id: string) {
    return this.blog.deleteTag(id);
  }

  @Get('authors')
  authors() {
    return this.blog.authors();
  }

  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Enviar imagem para o armazenamento do Ghost' })
  @UseFilters(BlogUploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', blogMulterOptions()))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.blog.uploadImage(file);
  }

  private userId(req: AuthRequest): number {
    const id = req.user?.userId ?? req.user?.sub;
    if (!id) throw new UnauthorizedException('Sessão inválida.');
    return Number(id);
  }
}
