import { Module } from '@nestjs/common';
import { ProductTypeService } from './productType.service';
import { AdminProductTypeController } from './controllers/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductType } from './entities/productType.entity';
import { CommonProductTypeController } from './controllers/common.controller';
import { PublicProductTypeController } from './controllers/public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductType])],
  controllers: [
    AdminProductTypeController,
    CommonProductTypeController,
    PublicProductTypeController,
  ],
  providers: [ProductTypeService],
  exports: [ProductTypeService],
})
export class ProductTypeModule {}
