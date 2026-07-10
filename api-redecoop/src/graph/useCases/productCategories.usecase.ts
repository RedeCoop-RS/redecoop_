import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphDto } from '../Dtos/graph.dto';
import { Product } from '@/product/entities/product.entity';

@Injectable()
export class ProductCategoriesGraphUseCase {
  constructor(
    @InjectRepository(Product)
    private readonly _ProductRepository: Repository<Product>,
  ) {}

  async execute(): Promise<GraphDto> {
    const products = await this._ProductRepository.find({ relations: { productCategory: true } });

    const result = products.reduce(
      (acc, product) => {
        const categoryName = product.productCategory.name;
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName]++;

        return acc;
      },
      {} as Record<string, number>,
    );

    const total = Object.values(result).reduce((sum, count) => sum + count, 0);
    const data = Object.entries(result).map(([name, count]) => ({
      name,
      y: count,
      percentage: ((count / total) * 100).toFixed(2),
    }));
    return { data };
  }
}
