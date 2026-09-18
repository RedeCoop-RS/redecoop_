import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/_common/decorators/skipAuth.decorator';
import { WebsiteAnalyticsService } from '../websiteAnalytics.service';
import { CollectAnalyticsDto } from '../Dtos/collectAnalytics.dto';

@ApiTags('Public')
@Controller('public/website-analytics')
@Public()
export class PublicWebsiteAnalyticsController {
  constructor(private readonly websiteAnalyticsService: WebsiteAnalyticsService) {}

  @Post('collect')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receber eventos anônimos de navegação do site' })
  async collect(
    @Body() payload: CollectAnalyticsDto,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    await this.websiteAnalyticsService.collect(payload, userAgent);
    return { ok: true };
  }
}
