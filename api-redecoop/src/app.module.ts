import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DriverModule } from './driver/driver.module';
import { CooperativeModule } from './cooperative/cooperative.module';
import { VehicleModule } from './vehicle/vehicles.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CityModule } from './city/city.module';
import { StateModule } from './state/state.module';
import { AuthGuard } from './_common/guards/auth.guard';
import { VisitantModule } from './visitant/visitant.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ProductModule } from './product/product.module';
import { FileSystemStoredFile, NestjsFormDataModule } from 'nestjs-form-data';
import { ProductCategoryModule } from './productCategory/productCategory.module';
import { ProductTypeModule } from './productType/productType.module';
import { ConfigSystemModule } from './configSystem/configSystem.module';
import { BusinessDeskModule } from './businessDesk/businessDesk.module';
import { BusinessDeskProductModule } from './businessDeskProduct/businessDeskProduct.module';
import { ConversationModule } from './conversation/conversation.module';
import { BusinessModule } from './business/business.module';
import { CollectivePurchaseModule } from './collectivePurchase/collectivePurchase.module';
import { CatalogSeasonalityModule } from './catalogSeasonality/catalogSeasonality.module';
import { CatalogModule } from './catalog/catalog.module';
import { DbModule } from './_common/database/db.module';
import { VehicleTypeModule } from './vehicleType/vehicleType.module';
import { PackagingModule } from './packaging/packaging.module';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from '@/_common/config/logger.config';
import { MapsModule } from './maps/maps.module';
import { TravelModule } from './travel/travel.module';
import { TravelOfferModule } from './travelOffer/travelOffer.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { AccessRequestModule } from './AcessRequest/accessRequest.module';
import { JwtModule } from '@nestjs/jwt';
import { CooperativeDebitModule } from './cooperativeDebit/cooperativeDebit.module';
import { ReportModule } from './report/report.module';
import { GraphModule } from './graph/graph.module';
import { EmailModule } from './email/email.module';
import { ValueRangeModule } from './valueRange/valueRange.module';
import { WeightRangeModule } from './weightRange/weightRange.module';
import { DistanceRangeModule } from './distanceRange/distanceRange.module';
import { CafModule } from './caf/caf.module';
import './_common/database/config';

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required. Set it in the environment before starting the API.');
  }
  return secret;
}

@Module({
  imports: [
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '1h' },
      global: true,
    }),
    WinstonModule.forRoot(winstonLoggerConfig),
    DbModule,
    EmailModule,
    NestjsFormDataModule.config({
      isGlobal: true,
      storage: FileSystemStoredFile,
      cleanupAfterFailedHandle: true,
    }),
    AuthModule,
    DriverModule,
    CooperativeModule,
    VehicleModule,
    CityModule,
    StateModule,
    VisitantModule,
    ProductModule,
    CatalogModule,
    ProductCategoryModule,
    ProductTypeModule,
    ConfigSystemModule,
    BusinessDeskModule,
    BusinessDeskProductModule,
    CatalogSeasonalityModule,
    ConversationModule,
    BusinessModule,
    CollectivePurchaseModule,
    VehicleTypeModule,
    PackagingModule,
    MapsModule,
    TravelModule,
    TravelOfferModule,
    FaqModule,
    NotificationModule,
    AccessRequestModule,
    CooperativeDebitModule,
    ReportModule,
    GraphModule,
    WeightRangeModule,
    DistanceRangeModule,
    ValueRangeModule,
    CafModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AppService,
  ],
})
export class AppModule {}
