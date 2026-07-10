import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Catalog } from '../entities/catalog.entity';
import { Repository } from 'typeorm';
import { ProductDto } from '@/product/Dtos/product.dto';
import { plainToInstance } from 'class-transformer';
import { Product } from '@/product/entities/product.entity';

@Injectable()
export class CatalogPublicService {
  constructor(
    @InjectRepository(Catalog)
    private readonly catalogRepository: Repository<Catalog>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  

}
