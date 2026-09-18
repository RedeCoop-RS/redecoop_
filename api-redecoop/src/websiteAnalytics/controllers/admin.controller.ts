import { Controller, Get, Query, SerializeOptions } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { WebsiteAnalyticsService } from '../websiteAnalytics.service';
import { AnalyticsHeatmapQueryDto, AnalyticsRangeDto } from '../Dtos/analyticsQuery.dto';

@ApiBearerAuth()
@ApiTags('Website analytics')
@Controller('root/website-analytics')
@Roles(UserRole.ADMIN)
@SerializeOptions({ excludeExtraneousValues: false })
export class AdminWebsiteAnalyticsController {
  constructor(private readonly websiteAnalyticsService: WebsiteAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Resumo de visitas do site público' })
  overview(@Query() query: AnalyticsRangeDto) {
    return this.websiteAnalyticsService.overview(query);
  }

  @Get('pages')
  @ApiOperation({ summary: 'Telas mais acessadas e tempo de permanência' })
  pages(@Query() query: AnalyticsRangeDto) {
    return this.websiteAnalyticsService.pages(query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Série diária de visitantes e pageviews' })
  timeseries(@Query() query: AnalyticsRangeDto) {
    return this.websiteAnalyticsService.timeseries(query);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Mapa de calor de cliques e profundidade de scroll' })
  heatmap(@Query() query: AnalyticsHeatmapQueryDto) {
    return this.websiteAnalyticsService.heatmap(query);
  }
}
