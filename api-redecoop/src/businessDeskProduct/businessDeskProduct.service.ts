import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BusinessDeskProduct } from './entities/businessDeskProduct.entity';
import { Repository } from 'typeorm';
import { CreateBusinessDeskProductDto } from './Dtos/createBusinessDeskProduct.dto';
import { CatalogService } from '@/catalog/services/catalog.service';
import { BusinessDesk } from '@/businessDesk/entities/businessDesk.entity';

@Injectable()
export class BusinessDeskProductService {
  constructor(
    @InjectRepository(BusinessDeskProduct)
    private readonly businessDeskProductRepository: Repository<BusinessDeskProduct>,
    private readonly catalogService: CatalogService,
  ) {}

  async saveBusinessDeskProduct(
    businessDesk: BusinessDesk,
    products: CreateBusinessDeskProductDto[],
  ) {
    const processedProductIds = new Set<number>();

    for (const product of products) {
      if (processedProductIds.has(product.productId)) {
        throw new BadRequestException('Produto Duplicado, informe o produto apenas um vez.');
      }

      const existsProductInCatalog = await this.catalogService.existProductInCatalog(
        product.productId,
        businessDesk.cooperativeId,
      );

      if (!existsProductInCatalog) {
        throw new NotFoundException(
          `O Produto ${product.productId} não está no catalógo da cooperativa, adicione e volte a tentar.`,
        );
      }

      let businessDeskProduct = await this.businessDeskProductRepository.findOneBy({
        businessDesk,
        product: { id: product.productId },
        weight: product.weight,
      });

      if (!businessDeskProduct) {
        businessDeskProduct = this.businessDeskProductRepository.create({
          product: { id: product.productId },
          businessDesk,
          weight: product.weight,
        });
      }

      await this.businessDeskProductRepository.save(businessDeskProduct);

      processedProductIds.add(product.productId);
    }
  }

  async updateBusinessDeskProduct(
    businessDesk: BusinessDesk,
    products: CreateBusinessDeskProductDto[],
  ) {
    const processedProductIds = new Set<number>();

    for (const product of businessDesk.businessDeskProducts) {
      if (
        !products.some(
          (businessDeskProduct) => businessDeskProduct.productId === product.product.id,
        )
      ) {
        await this.businessDeskProductRepository.remove(product);
      }
    }

    for (const product of products) {
      if (processedProductIds.has(product.productId)) {
        throw new BadRequestException(
          `O produto com ID ${product.productId} está duplicado na solicitação. Por favor, informe cada produto apenas uma vez.`,
        );
      }

      let businessDeskProduct = businessDesk.businessDeskProducts.find(
        (p) => p.product.id === product.productId,
      );

      if (!businessDeskProduct) {
        const existsProductInCatalog = await this.catalogService.existProductInCatalog(
          product.productId,
          businessDesk.cooperativeId,
        );

        if (!existsProductInCatalog) {
          throw new NotFoundException(
            `O Produto com ID ${product.productId} não está no seu catálogo`,
          );
        }

        businessDeskProduct = this.businessDeskProductRepository.create({
          businessDesk,
          weight: product.weight,
          product: { id: product.productId },
        });
      } else {
        businessDeskProduct.weight = product.weight;
      }

      await this.businessDeskProductRepository.save(businessDeskProduct);

      processedProductIds.add(product.productId);
    }
  }
}
