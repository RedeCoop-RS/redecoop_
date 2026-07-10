import { Injectable, NotFoundException } from '@nestjs/common';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { Product } from '@/product/entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { plainToInstance } from 'class-transformer';
import { ProductDto } from '@/product/Dtos/product.dto';

@Injectable()
export class ListCooperativeProductsUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(cooperativeId: number, query: PaginateQuery) {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id: cooperativeId },
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada');
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.catalogs', 'catalog')
      .where('catalog.cooperativeId = :cooperativeId', { cooperativeId })
      .orderBy('product.name', 'ASC');

    const { filter } = query;

    if (filter && filter.categoryId) {
      queryBuilder.andWhere('product.productCategoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    if (filter && filter.typeId) {
      queryBuilder.andWhere('product.productTypeId = :typeId', { typeId: filter.typeId });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformedData = plainToInstance(ProductDto, data);
    return { data: transformedData, ...pagination };
  }
}
