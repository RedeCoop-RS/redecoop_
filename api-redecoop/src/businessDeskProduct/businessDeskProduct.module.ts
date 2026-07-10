import { Module } from '@nestjs/common';
import { BusinessDeskProductService } from './businessDeskProduct.service';
import { CatalogModule } from 'src/catalog/catalog.module';
import { BusinessDeskProduct } from './entities/businessDeskProduct.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [CatalogModule, TypeOrmModule.forFeature([BusinessDeskProduct])],
  controllers: [],
  providers: [BusinessDeskProductService],
  exports: [BusinessDeskProductService],
})
export class BusinessDeskProductModule {}
