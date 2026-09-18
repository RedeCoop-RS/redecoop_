import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsiteSession } from './entities/websiteSession.entity';
import { WebsitePageView } from './entities/websitePageView.entity';
import { WebsiteClick } from './entities/websiteClick.entity';
import { WebsiteAnalyticsService } from './websiteAnalytics.service';
import { PublicWebsiteAnalyticsController } from './controllers/public.controller';
import { AdminWebsiteAnalyticsController } from './controllers/admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteSession, WebsitePageView, WebsiteClick])],
  controllers: [PublicWebsiteAnalyticsController, AdminWebsiteAnalyticsController],
  providers: [WebsiteAnalyticsService],
})
export class WebsiteAnalyticsModule {}
