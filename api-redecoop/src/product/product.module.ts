import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { AdminProductController } from './controllers/admin.controller';
import { CooperativeProductController } from './controllers/cooperative.controlller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductType } from '../productType/entities/productType.entity';
import { ProductCategory } from '../productCategory/entities/productCategory.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Product, ProductType, ProductCategory])], 
    controllers: [AdminProductController, CooperativeProductController],
    providers: [ProductService],
    exports: [ProductService]
})
export class ProductModule { }
