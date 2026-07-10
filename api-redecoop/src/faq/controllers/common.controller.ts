import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { FaqService } from '../faq.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { CreateFaqDto } from '../Dtos/createFaq.dto';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';

@ApiBearerAuth()
@ApiTags('Faq')
@Controller('common/faq')
@Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
export class AdminCommonController {
  constructor(private readonly faqService: FaqService) {}

  @Get('list')
  @PaginatedSwagger({ filterableColumns: ['content'] })
  @ApiOperation({
    summary: 'Listar Perguntas do FAQ',
  })
  async listAll(@Paginate() query: PaginateQuery) {
    return await this.faqService.findAll(query);
  }

  @Get('view/:id')
  @ApiOperation({
    summary: 'Ver uma pergunta do FAQ',
  })
  async view(@Param('id', ParseIntPipe) id: number) {
    return await this.faqService.view(id);
  }
}
