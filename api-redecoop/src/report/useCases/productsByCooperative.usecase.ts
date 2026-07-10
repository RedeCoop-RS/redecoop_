import { Catalog } from '@/catalog/entities/catalog.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ReportService } from '../report.service';

@Injectable()
export class ProductsByCooperativeReportUseCase {
  constructor(
    @InjectRepository(Catalog)
    private readonly _catalogRepository: Repository<Catalog>,
    @InjectRepository(Cooperative)
    private readonly _cooperativeRepository: Repository<Cooperative>,
    private readonly reportService: ReportService,
  ) {}

  public async execute(cooperativeId: number, productCategoryId?: number) {
    const cooperative = await this._cooperativeRepository.findOneBy({ id: cooperativeId });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada.');
    }

    let content = [];

    let queryBuilder = this._catalogRepository
      .createQueryBuilder('catalog')
      .leftJoinAndSelect('catalog.product', 'product')
      .leftJoinAndSelect('product.productType', 'productType')
      .leftJoinAndSelect('product.productCategory', 'productCategory')
      .where('catalog.cooperativeId = :cooperativeId', { cooperativeId });

    if (productCategoryId) {
      queryBuilder = queryBuilder.andWhere('productCategory.id = :categoryId', {
        categoryId: productCategoryId,
      });
    }

    const products = await queryBuilder.getMany();

    for (let index = 0; index < products.length; index++) {
      const product = products[index];
      content.push({
        productName: product.product.name,
        productType: product.product.productType?.name || '',
        productCategory: product.product.productCategory?.name || '',
      });
    }

    const title = `Relatório de Produtos - ${cooperative.fantasyName?.trim() || cooperative.companyName}`;
    const headers = [
      { name: 'Nome do Produto', key: 'productName' },
      { name: 'Tipo de Produto', key: 'productType' },
      { name: 'Categoria do Produto', key: 'productCategory' },
    ];


    return await this.reportService.generateExcell(title, headers, content);
  }
}
