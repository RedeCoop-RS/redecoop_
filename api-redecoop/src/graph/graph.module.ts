import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativesByMunicipalityGraphUseCase } from './useCases/cooperativesByMucipality.usecase';
import { GraphController } from './graph.controller';
import { ProductCategoriesGraphUseCase } from './useCases/productCategories.usecase';
import { Product } from '@/product/entities/product.entity';
import { ProductCategory } from '@/productCategory/entities/productCategory.entity';
import { Visitant } from '@/visitant/entities/visitant.entity';
import { VisitantsByMunicipalityGraphUseCase } from './useCases/visitantsByMucipality.usecase';
import { VisitantsByTypeGraphUseCase } from './useCases/visitantsByType.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([Cooperative, Product, Visitant, ProductCategory])],
  controllers: [GraphController],
  providers: [
    CooperativesByMunicipalityGraphUseCase,
    ProductCategoriesGraphUseCase,
    VisitantsByMunicipalityGraphUseCase,
    VisitantsByTypeGraphUseCase
  ],
  exports: [],
})
export class GraphModule {}
