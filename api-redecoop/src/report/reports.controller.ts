import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { ReportDto, ReportTypes } from './Dtos/report.dto';
import { HandleReportsUseCase } from './useCases/handleReports.usecase';
import { ReportsAvailableUseCase } from './useCases/reportsAvailable.usecase';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Report')
@Controller('report')
@Roles(UserRole.ADMIN)
export class ReportController {
  constructor(
    private readonly handleReportsUseCase: HandleReportsUseCase,
    private readonly reportsAvailableUseCase: ReportsAvailableUseCase,
  ) {}

  @Post('generator')
  async getReport(@Body() postData: ReportDto) {
    const filename = await this.handleReportsUseCase.execute(postData);
    return { filename };
  }

  @Get()
  async reportsAvailable() {
    return this.reportsAvailableUseCase.execute();
  }
}
