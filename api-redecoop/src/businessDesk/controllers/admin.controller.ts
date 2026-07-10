import { Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { BusinessDeskService } from '../businessDesk.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';

@ApiBearerAuth()
@ApiTags('BusinessDesk')
@Controller('root/business-desk')
@Roles(UserRole.ADMIN)
export class AdminBusinessDeskController {
  constructor(private readonly businessDeskService: BusinessDeskService) {}

  /** Soft delete: row remains in DB, hidden from default listings. */
  @Patch(':id/soft-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    await this.businessDeskService.softDeleteByAdmin(id);
  }
}
