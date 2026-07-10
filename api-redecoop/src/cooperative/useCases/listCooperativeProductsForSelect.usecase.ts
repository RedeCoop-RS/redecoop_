import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { Product } from '@/product/entities/product.entity';
import { plainToInstance } from 'class-transformer';
import { ProductDto } from '@/product/Dtos/product.dto';

@Injectable()
export class ListCooperativeProductsForSelectUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async execute(cooperativeId: number) {
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
      .select(['product.id', 'product.name']);

    const products = queryBuilder.getMany();

    return plainToInstance(ProductDto, products);
  }
}
