import { Catalog } from '@/catalog/entities/catalog.entity';
import { CatalogSeasonality } from '@/catalogSeasonality/entities/catalogSeasonality.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { UserRole } from '@/User/entities/user.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { plainToInstance } from 'class-transformer';
import { PublicCatalogProductDto } from '../Dtos/publicCatalogProduct.dto';

@Injectable()
export class ListPublicCatalogProductsUseCase {
  constructor(
    @InjectRepository(Catalog)
    private readonly catalogRepository: Repository<Catalog>,
    @InjectRepository(CatalogSeasonality)
    private readonly catalogSeasonalityRepository: Repository<CatalogSeasonality>,
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
  ) {}

  async execute(cooperativeId: number | undefined, query: PaginateQuery) {
    if (cooperativeId !== undefined) {
      const cooperative = await this.cooperativeRepository.findOne({
        where: { id: cooperativeId, active: true },
        relations: ['user'],
      });
      if (!cooperative || cooperative.user?.role === UserRole.ADMIN) {
        throw new NotFoundException('Cooperativa não encontrada');
      }
    }

    const qb = this.catalogRepository
      .createQueryBuilder('catalog')
      .innerJoinAndSelect('catalog.product', 'product')
      .innerJoinAndSelect('catalog.cooperative', 'cooperative')
      .innerJoin('cooperative.user', 'coopUser')
      .leftJoinAndSelect('product.productCategory', 'productCategory')
      .leftJoinAndSelect('product.productType', 'productType')
      .where('cooperative.active = :active', { active: true })
      .andWhere('coopUser.role != :adminRole', { adminRole: UserRole.ADMIN })
      .andWhere('catalog.deletedAt IS NULL')
      .andWhere('product.isActive = :pActive', { pActive: true })
      .orderBy('cooperative.companyName', 'ASC')
      .addOrderBy('product.name', 'ASC');

    if (cooperativeId !== undefined) {
      qb.andWhere('cooperative.id = :cid', { cid: cooperativeId });
    }

    const { filter } = query;
    if (filter?.categoryId) {
      qb.andWhere('product.productCategoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }
    if (filter?.typeId) {
      qb.andWhere('product.productTypeId = :typeId', { typeId: filter.typeId });
    }

    const paginated = await paginate(query, qb);
    const catalogs = paginated.data as Catalog[];
    const catalogIds = catalogs.map((c) => c.id);

    const seasonalitiesRows =
      catalogIds.length > 0
        ? await this.catalogSeasonalityRepository.find({
            where: { catalogId: In(catalogIds) },
            order: { month: 'ASC' },
          })
        : [];

    const byCatalogId = new Map<number, CatalogSeasonality[]>();
    for (const row of seasonalitiesRows) {
      const list = byCatalogId.get(row.catalogId) ?? [];
      list.push(row);
      byCatalogId.set(row.catalogId, list);
    }

    const transformedData = catalogs.map((catalog) =>
      this.toDto(catalog, byCatalogId.get(catalog.id) ?? []),
    );

    const { data: _drop, ...pagination } = paginated;
    return { data: transformedData, ...pagination };
  }

  private toDto(catalog: Catalog, seasonalities: CatalogSeasonality[]): PublicCatalogProductDto {
    const cooperative = catalog.cooperative;
    const product = catalog.product;
    const displayName =
      (cooperative.fantasyName || '').trim() || cooperative.companyName;

    return plainToInstance(
      PublicCatalogProductDto,
      {
        catalogId: catalog.id,
        cooperativeId: cooperative.id,
        cooperativeDisplayName: displayName,
        productId: product.id,
        productName: product.name,
        img: catalog.customImage?.trim() ? catalog.customImage : product.img,
        productCategoryId: product.productCategoryId,
        productTypeId: product.productTypeId,
        productCategory: product.productCategory,
        productType: product.productType,
        hasSeasonality: catalog.hasSeasonality,
        highEstimate: catalog.highEstimate ?? undefined,
        mediumEstimate: catalog.mediumEstimate ?? undefined,
        lowEstimate: catalog.lowEstimate ?? undefined,
        seasonalities: seasonalities.map((s) => ({
          month: s.month,
          seasonality: s.seasonality,
        })),
      },
      { excludeExtraneousValues: true },
    );
  }
}
