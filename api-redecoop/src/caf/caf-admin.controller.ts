import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { CafSyncService } from './caf-sync.service';

@ApiBearerAuth()
@ApiTags('CAF Admin')
@Controller('root/caf')
@Roles(UserRole.ADMIN)
export class CafAdminController {
  constructor(private readonly cafSyncService: CafSyncService) {}

  @Get('sync/vnc-info')
  vncInfo() {
    return this.cafSyncService.getVncInfo();
  }

  @Post('sync/start')
  startSync() {
    return this.cafSyncService.startSync();
  }

  @Get('sync/active')
  activeSync() {
    return this.cafSyncService.getActiveJob();
  }

  @Get('sync/status/:jobId')
  syncStatus(@Param('jobId') jobId: string) {
    return this.cafSyncService.getJob(jobId);
  }

  @Post('sync/cancel/:jobId')
  cancelSync(@Param('jobId') jobId: string) {
    return this.cafSyncService.cancelSync(jobId);
  }
}
