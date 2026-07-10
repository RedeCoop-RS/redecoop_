import { Module } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { HashService } from '../_common/services/passwordHash.service';
import { UploadService } from '../_common/services/fileUpload.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperative } from './entities/cooperative.entity';
import { User } from '../User/entities/user.entity';
import { UserModule } from '@/User/user.module';
import { CooperativeController } from './controllers/cooperative.controller';
import { PublicCooperativeController } from './controllers/public.controller';
import { UpdateCooperativeUseCase } from './useCases/updateCooperative.usecase';
import { UpdateEmailCooperativeLoginUseCase } from './useCases/updateEmailLoginusecase';
import { UpdatePasswordCooperativeUseCase } from './useCases/updatePasswordCooperative.usecase';
import { CreateCooperativeUseCase } from './useCases/createCooperative.usecase';
import { GetCooperativesUseCase } from './useCases/getCooperatives.usecase';
import { ListCooperativesForSelectUseCase } from './useCases/listCooperativesForSelect.usecase';
import { GetCooperativeUseCase } from './useCases/getCooperative.usecase';
import { GetCooperativeSummaryUseCase } from './useCases/getCooperativeSummary.usecase';
import { GetCooperativeForPublicUseCase } from './useCases/getCooperativeForPublic.usecase';
import { ListCooperativesForPublicUseCase } from './useCases/listCooperativesForPublic.usecase';
import { Product } from '@/product/entities/product.entity';
import { Catalog } from '@/catalog/entities/catalog.entity';
import { CatalogSeasonality } from '@/catalogSeasonality/entities/catalogSeasonality.entity';
import { ListCooperativeProductsUseCase } from './useCases/listCooperativeProducts.usecase';
import { ListPublicCatalogProductsUseCase } from './useCases/listPublicCatalogProducts.usecase';
import { ListCooperativeProductsForSelectUseCase } from './useCases/listCooperativeProductsForSelect.usecase';
import { UpdateCooperativeActiveStatusUseCase } from './useCases/updateCooperativeUpdateActive.usecase';
import { CooperativeDeliveryCity } from './entities/cooperative-delivery-city.entity';
import { City } from '@/city/entities/city.entity';
import { ChangeCoopPassByAdminUseCase } from './useCases/changeCopPassByAdmin.usecase';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([
      Cooperative,
      CooperativeDeliveryCity,
      City,
      User,
      Product,
      Catalog,
      CatalogSeasonality,
    ]),
  ],
  controllers: [CooperativeController, PublicCooperativeController],
  providers: [
    CooperativeService,
    UploadService,
    HashService,
    UpdateCooperativeUseCase,
    UpdateEmailCooperativeLoginUseCase,
    UpdatePasswordCooperativeUseCase,
    CreateCooperativeUseCase,
    GetCooperativesUseCase,
    ListCooperativesForSelectUseCase,
    GetCooperativeUseCase,
    GetCooperativeSummaryUseCase,
    GetCooperativeForPublicUseCase,
    ListCooperativesForPublicUseCase,
    ListCooperativeProductsUseCase,
    ListPublicCatalogProductsUseCase,
    ListCooperativeProductsForSelectUseCase,
    UpdateCooperativeActiveStatusUseCase,
    ChangeCoopPassByAdminUseCase
  ],
  exports: [CooperativeService, TypeOrmModule],
})
export class CooperativeModule {}
