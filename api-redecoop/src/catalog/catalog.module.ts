import { Module } from '@nestjs/common';
import { CooperativeCatalogController } from './controllers/cooperative.controllers';
import { CatalogService } from './services/catalog.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalog } from './entities/catalog.entity';
import { Product } from '@/product/entities/product.entity';
import { CatalogPackaging } from '@/catalogPackaging/entities/catalogPackaging.entity';
import { CatalogSeasonality } from '@/catalogSeasonality/entities/catalogSeasonality.entity';
import { CommonCatalogController } from './controllers/common.controller';
import { CatalogPublicService } from './services/catalogPublic.service';
import { ProductTypeService } from '@/productType/productType.service';
import { ProductCategoryService } from '@/productCategory/productCategory.service';
import { ProductType } from '@/productType/entities/productType.entity';
import { ProductCategory } from '@/productCategory/entities/productCategory.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Catalog,
      Product,
      ProductCategory,
      ProductType,
      CatalogPackaging,
      CatalogSeasonality,
      Cooperative,
    ]),
  ],
  controllers: [CooperativeCatalogController, CommonCatalogController],
  providers: [CatalogService, CatalogPublicService, ProductTypeService, ProductCategoryService],
  exports: [CatalogService],
})
export class CatalogModule {}
