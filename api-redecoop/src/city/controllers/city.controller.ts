import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CityService } from '../city.service';
import { Public } from '../../_common/decorators/skipAuth.decorator';
import { Roles } from '@/_common/decorators/role.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';

@ApiTags('City')
@Controller('city')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Public()
  @Get('find-by-state/:id')
  @ApiOperation({
    summary: 'Listar todas as cidades de um estado do Brasil',
  })
  async findByState(@Param('id', ParseIntPipe) id: number) {
    return await this.cityService.findByState(id);
  }

  @ApiBearerAuth()
  @Get('search')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Pesquisar cidade pelo nome',
  })
  @Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
  async searchByName(@Query('q') query: string) {
    return await this.cityService.searchByName(query);
  }
}
