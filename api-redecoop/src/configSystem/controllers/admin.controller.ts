import { Body, Controller, Get, Put } from '@nestjs/common';
import { ConfigSystemService } from '../configSystem.service';
import { Roles } from '@/_common/decorators/role.decorator';
import { UpdateConfigSystemDto } from '../Dtos/updateConfigSystem.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('ConfigSystem')
@Controller('root/config')
@Roles(UserRole.ADMIN)
export class AdminConfigSystemController {
  constructor(private readonly configSystemService: ConfigSystemService) {}

  @Get('view')
  @ApiOperation({
    summary: 'Ver configurações do sistema',
  })
  async show() {
    return await this.configSystemService.view();
  }

  @Put('update')
  @ApiOperation({
    summary: 'Atualizar configurações do sistema',
  })
  async update(@Body() postData: UpdateConfigSystemDto) {
    await this.configSystemService.update(postData);
  }
}
