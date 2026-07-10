import { Public } from '@/_common/decorators/skipAuth.decorator';
import { Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessRequestService } from '../accessRequest.service';
import { AccessRequestDto } from '../Dtos/accessRequest.dto';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { Paginate } from '@/_common/utils/paginate/decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';

@ApiBearerAuth()
@ApiTags('Requests')
@Controller('root/request')
@Public()
export class AdminAccessRequestController {
  constructor(private readonly AccessRequestService: AccessRequestService) {}

  @Get('list')
  @ApiOperation({ summary: 'Listar Solicitação para participar da plataforma' })
  @PaginatedSwagger()
  @ApiResponse({ type: AccessRequestDto })
  async list(@Paginate() query: PaginateQuery) {
    return await this.AccessRequestService.list(query);
  }

  @Delete(':id/delete')
  @ApiOperation({ summary: 'Excluir Requisitante' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.AccessRequestService.delete(id);
  }
}
