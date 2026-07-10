import { Roles } from '@/_common/decorators/role.decorator';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { PackagingService } from '../packaging.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PackagingDto } from '../Dtos/packaging.dto';
import { UserRole } from '@/User/entities/user.entity';
import { CreatePackagingTypeDto } from '../Dtos/createPackaging.dto';
@ApiBearerAuth()
@ApiTags('Packaging')
@Controller('common/packaging')
export class CommonPackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Roles(UserRole.COOPERATIVE, UserRole.ADMIN)
  @Get('list')
  @ApiOperation({ summary: 'Listar todos os pacotes' })
  @ApiResponse({ type: PackagingDto, isArray: true })
  async list(): Promise<PackagingDto[]> {
    return await this.packagingService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @Post('create')
  @ApiOperation({summary: 'Criar pacote'})
  async create(@Body() postData: CreatePackagingTypeDto): Promise<void> {
    return await this.packagingService.create(postData);
  }
}
