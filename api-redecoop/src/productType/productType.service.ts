import { Injectable } from '@nestjs/common';
import { CreateProductTypeDto } from './Dtos/productTypeCreate.dto';
import { Repository } from 'typeorm';
import { ProductType } from './entities/productType.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductTypeResponseDto, ProductTypeSummaryDto } from './Dtos/productTypeResponse.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ProductTypeService {
  constructor(
    @InjectRepository(ProductType)
    private readonly productTypeRepository: Repository<ProductType>,
  ) {}

  async getMpyForProductType(productTypeId: number): Promise<number> {
    const productType = await this.productTypeRepository.findOne({ where: { id: productTypeId } });
    return productType.mpy;
  }

  async create(data: CreateProductTypeDto) {
    const newProductType = this.productTypeRepository.create(data);
    await this.productTypeRepository.save(newProductType);
  }

  async listProductTypeOptions(): Promise<ProductTypeSummaryDto[]> {
    const query = await this.productTypeRepository.find({ select: ['id', 'name'] });
    return plainToInstance(ProductTypeSummaryDto, query);
  }

  async list(): Promise<ProductTypeSummaryDto[]> {
    const query = await this.productTypeRepository.find({ select: ['id', 'name'] });
    return plainToInstance(ProductTypeSummaryDto, query);
  }
}
