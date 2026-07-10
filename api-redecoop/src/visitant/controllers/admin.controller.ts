import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { VisitantService } from '../visitant.service';
import { VisitantDto } from '../Dtos/visitant.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';
import { PaginatedSwagger } from '@/_common/decorators/paginateSwagger.decorator';
import { PaginateQuery } from '@/_common/utils/paginate/paginate';
import { Paginate } from '@/_common/utils/paginate/decorator';

@ApiBearerAuth()
@ApiTags('Visitant')
@Controller('root/visitant')
@Roles(UserRole.ADMIN)
export class AdminVisitantController {
  constructor(private visitantService: VisitantService) {}

  @Get('list')
  @ApiOperation({ summary: 'Listar todos os visitantes' })
  @PaginatedSwagger()
  @ApiResponse({ type: VisitantDto, isArray: true })
  async list(@Paginate() query: PaginateQuery) {
    return await this.visitantService.listAll(query);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Inativar/Ativar Visitante' })
  async updateStatusVisitor(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return await this.visitantService.updateStatus(id, isActive);
  }
}
