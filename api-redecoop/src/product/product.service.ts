import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from './Dtos/productCreate.dto';
import { plainToInstance } from 'class-transformer';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from '../productType/entities/productType.entity';
import { ProductCategory } from '../productCategory/entities/productCategory.entity';
import { ProductDto } from './Dtos/product.dto';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductType)
    private readonly productTypeRepository: Repository<ProductType>,
    @InjectRepository(ProductCategory)
    private readonly productCategoryRepository: Repository<ProductCategory>,
  ) {}

  async createProduct(data: CreateProductDto) {
    const { productTypeId, productCategoryId, img, name } = data;

    await this.validateProductTypeAndCategory(productTypeId, productCategoryId);

    if (!img || !img.path) {
      throw new BadRequestException('Você deve inserir uma imagem no produto.');
    }

    const product = this.productRepository.create({
      name,
      img: img.filename,
      productTypeId,
      productCategoryId,
    });

    await this.productRepository.save(product);
  }

  async updateProduct(data: UpdateProductDto, id: number) {
    const { img } = data;

    const product = await this.productRepository.findOneBy({ id });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    await this.validateProductTypeAndCategory(data.productTypeId, data.productCategoryId);

    Object.assign(product, data);

    if (img && img.path) {
      product.img = img.filename;
    }

    await this.productRepository.save(product);
  }

  async deleteProduct(id:number){
    
    const product = await this.productRepository.findOneBy({id});

    if(!product) throw new NotFoundException("Produto não encontrado");
    product.isActive = false;
    await this.productRepository.save(product);

  }

  private async validateProductTypeAndCategory(
    productTypeId?: number,
    productCategoryId?: number,
  ): Promise<void> {
    if (productTypeId !== undefined) {
      const existType = await this.productTypeRepository.exists({ where: { id: productTypeId } });
      if (!existType) {
        throw new NotFoundException('Tipo de produto não encontrado');
      }
    }

    if (productCategoryId !== undefined) {
      const existCategory = await this.productCategoryRepository.exists({
        where: { id: productCategoryId },
      });
      if (!existCategory) {
        throw new NotFoundException('Categoria do produto não encontrada');
      }
    }
  }

  async findById(id: number) {
    const query = await this.productRepository.findOne({
      where: { id },
      relations: ['productCategory', 'productType'],
    });
    return plainToInstance(ProductDto, query);
  }

  async findAll(query: PaginateQuery): Promise<Paginated<ProductDto>> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.productCategory', 'productCategory')
      .leftJoinAndSelect('product.productType', 'productType')
      .where('product.isActive = :status', {status: true})
      .orderBy('product.name', 'ASC');

    const { filter } = query;

    if (filter && filter.categoryId) {
      queryBuilder.andWhere('productCategory.id = :categoryId', { categoryId: filter.categoryId });
    }

    if (filter && filter.typeId) {
      queryBuilder.andWhere('productType.id = :typeId', { typeId: filter.typeId });
    }

    if (filter && typeof filter.name === 'string' && filter.name.trim() !== '') {
      queryBuilder.andWhere('INSTR(LOWER(product.name), LOWER(:nameNeedle)) > 0', {
        nameNeedle: filter.name.trim(),
      });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;
    const transformedData = plainToInstance(ProductDto, data);
    return { data: transformedData, ...pagination } as Paginated<ProductDto>;
  }

  async findAllForCooperative(): Promise<ProductDto[]> {
    const query = await this.productRepository.find({
      relations: ['productType', 'productCategory'],
      where: {isActive: true},
      order: {name: 'ASC'}
    });
    return plainToInstance(ProductDto, query);
  }

  async countProductsByCategory(filters?: { typeId?: string; name?: string }) {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.productCategory', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(product.id)', 'total')
      .where('product.isActive = :status', { status: true });

    if (filters?.typeId) {
      qb.andWhere('product.product_type_id = :typeId', { typeId: filters.typeId });
    }
    if (filters?.name?.trim()) {
      qb.andWhere('INSTR(LOWER(product.name), LOWER(:nameNeedle)) > 0', {
        nameNeedle: filters.name.trim(),
      });
    }

    const result = await qb
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('category.name', 'ASC')
      .getRawMany();

    return result.map((item) => ({
      categoryId: parseInt(String(item.categoryId), 10),
      categoryName: item.categoryName,
      total: parseInt(String(item.total), 10),
    }));
  }
}
