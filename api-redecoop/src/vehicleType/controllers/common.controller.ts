import { Roles } from '@/_common/decorators/role.decorator';
import { Controller, Get } from '@nestjs/common';
import { VehicleTypeService } from '../vehicleType.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VehicleTypeSummaryDto } from '../dtos/vehicleTypeResponse.dto';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('VehicleType')
@Controller('common/vehicle-type')
@Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
export class CommonVehicleTypeController {
  constructor(private readonly vehicleTypeService: VehicleTypeService) {}

  @Get('list')
  @ApiOperation({ summary: 'Listar tipos de veiculos' })
  @ApiResponse({ type: VehicleTypeSummaryDto, isArray: true })
  async listAll() {
    return await this.vehicleTypeService.listAll();
  }
}
