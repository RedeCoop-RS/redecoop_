import { Roles } from '@/_common/decorators/role.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { MapsService } from '../maps.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DistanceQueryDto } from '../Dtos/distanceQuery.dto';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('Maps')
@Controller('common/maps')
@Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('auto-complete')
  @ApiOperation({ summary: 'Pesquisar endereço' })
  @ApiQuery({ name: 'q', type: 'string', example: 'Av. Unisinos, 950 - Cristo Rei, São Leopoldo' })
  async getCoordinates(@Query('q') q: string) {
    return await this.mapsService.autoComplete(q);
  }

  @Get('distance')
  @ApiOperation({ summary: 'Calcular Distancia entre coordenadas' })
  @ApiResponse({ type: Number })
  async getDistance(@Query() query: DistanceQueryDto) {
    const start: [number, number] = [query.startLng, query.startLat];
    const end: [number, number] = [query.endLng, query.endLat];
    return this.mapsService.getRouteDistance(start, end);
  }
}
