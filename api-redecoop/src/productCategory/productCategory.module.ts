import { Module } from '@nestjs/common';
import { ProductCategoryService } from './productCategory.service';
import { AdminProductCategoryController } from './controllers/admin.controller';
import { ProductCategory } from './entities/productCategory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonProductCategoryController } from './controllers/common.controller';
import { PublicProductCategoryController } from './controllers/public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCategory])],
  controllers: [
    AdminProductCategoryController,
    CommonProductCategoryController,
    PublicProductCategoryController,
  ],
  providers: [ProductCategoryService],
  exports: [ProductCategoryService],
})
export class ProductCategoryModule {}
