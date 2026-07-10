import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import {
  CatalogSeasonality,
  SeasonalityLevel,
} from 'src/catalogSeasonality/entities/catalogSeasonality.entity';
import { Equal, FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  CatalogPackaging,
  PackagingType,
} from 'src/catalogPackaging/entities/catalogPackaging.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '@/product/entities/product.entity';
import { Catalog } from '../entities/catalog.entity';
import { CreateCatalogDto } from '../Dtos/createCatalog.dto';
import { UpdateCatalogDto } from '../Dtos/updateCatalog';
import { plainToInstance } from 'class-transformer';
import { CatalogDto } from '../Dtos/catalog.dto';
import { CreateCatalogPackagingDto } from '@/catalogPackaging/dtos/createCatalogPackaging.dto';
import { ProductDto } from '@/product/Dtos/product.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Catalog)
    private readonly catalogRepository: Repository<Catalog>,
    @InjectRepository(CatalogSeasonality)
    private readonly catalogSeasonalityRepository: Repository<CatalogSeasonality>,
    @InjectRepository(CatalogPackaging)
    private readonly catalogPackagingRepository: Repository<CatalogPackaging>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
  ) {}

  /**
   * JWT `sub` deve ser o id da cooperativa; em tokens antigos ou erros pode ser o id do user.
   */
  async resolveCooperativeId(user: UserLoggedDto): Promise<number> {
    const byCoopPk = await this.cooperativeRepository.findOne({
      where: { id: user.sub },
      select: ['id'],
    });
    if (byCoopPk) {
      return byCoopPk.id;
    }
    const byUserIdEqSub = await this.cooperativeRepository.findOne({
      where: { userId: user.sub },
      select: ['id'],
    });
    if (byUserIdEqSub) {
      return byUserIdEqSub.id;
    }
    if (user.userId != null) {
      const byJwtUserId = await this.cooperativeRepository.findOne({
        where: { userId: user.userId },
        select: ['id'],
      });
      if (byJwtUserId) {
        return byJwtUserId.id;
      }
    }
    throw new BadRequestException(
      'Não foi possível identificar a cooperativa. Faça login novamente ou contacte o suporte.',
    );
  }

  async existProductInCatalog(productId: number, cooperativeId: number): Promise<boolean> {
    return await this.catalogRepository.existsBy({
      cooperative: { id: cooperativeId },
      product: { id: productId },
    });
  }

  @Transactional()
  async create(data: CreateCatalogDto & { cooperativeId: number }): Promise<void> {
    const {
      cooperativeId,
      productId,
      hasSeasonality,
      highEstimate,
      mediumEstimate,
      lowEstimate,
      seasonality,
      hasPrimaryPackaging,
      hasSecondaryPackaging,
      primaryPackagingDetails,
      secondaryPackagingDetails,
      customImage,
    } = data;

    if (!(await this.productRepository.exists({ where: { id: productId } }))) {
      throw new BadRequestException('Este produto não existe ou não está disponivel');
    }

    if (await this.existProductInCatalog(productId, cooperativeId)) {
      throw new BadRequestException('Este produto já existe no seu catálogo');
    }

    //adicionamos o produto no catalogo
    const newCatalogItem = this.catalogRepository.create({
      cooperative: { id: cooperativeId },
      product: { id: productId },
      hasSeasonality,
      highEstimate,
      mediumEstimate,
      lowEstimate,
      hasPrimaryPackaging,
      hasSecondaryPackaging,
      customImage: customImage && customImage.trim() !== '' ? customImage : null,
    });

    const catalog = await this.catalogRepository.save(newCatalogItem);

    //adicionar sazonalidade, opcional
    if (hasSeasonality && seasonality) {
      const promiseSeasonality = seasonality.map(async (item) => {
        const newSeasonality = this.catalogSeasonalityRepository.create({
          catalog,
          month: item.month,
          seasonality: item.seasonality,
        });
        await this.catalogSeasonalityRepository.save(newSeasonality);
      });

      await Promise.all(promiseSeasonality);
    }

    const linkPackagingWithProduct = async (
      details: CreateCatalogPackagingDto,
      type: PackagingType,
    ) => {
      const packaging = this.catalogPackagingRepository.create({
        catalog,
        packaging: { id: details.packagingId },
        weight: details.weight,
        info: details.info,
        type,
      });
      await this.catalogPackagingRepository.save(packaging);
    };

    //adicionar embalagem, opcional
    if (hasPrimaryPackaging && primaryPackagingDetails) {
      await linkPackagingWithProduct(primaryPackagingDetails, PackagingType.PRIMARY);
    }

    if (hasSecondaryPackaging && secondaryPackagingDetails) {
      await linkPackagingWithProduct(secondaryPackagingDetails, PackagingType.SECONDARY);
    }
  }

  @Transactional()
  async update(id: number, data: UpdateCatalogDto & { cooperativeOwnerId: number }): Promise<void> {
    const {
      cooperativeOwnerId,
      hasSeasonality,
      highEstimate,
      mediumEstimate,
      lowEstimate,
      seasonality,
      hasPrimaryPackaging,
      hasSecondaryPackaging,
      primaryPackagingDetails,
      secondaryPackagingDetails,
      customImage,
    } = data;

    const catalog = await this.catalogRepository.findOne({
      where: { id, cooperativeId: cooperativeOwnerId },
      relations: ['seasonalities', 'packaging'],
    });

    if (!catalog) {
      throw new NotFoundException('Produto não encontrado no seu catálogo');
    }

    Object.assign(catalog, {
      highEstimate,
      mediumEstimate,
      lowEstimate,
      hasPrimaryPackaging,
      hasSecondaryPackaging,
      hasSeasonality,
    });

    if (customImage !== undefined) {
      catalog.customImage =
        customImage === null || String(customImage).trim() === '' ? null : String(customImage);
    }

    // Handle Seasonality Updates
    if (hasSeasonality !== undefined) {
      if (hasSeasonality) {
        for (const item of seasonality) {
          const existingSeasonality = catalog.seasonalities.find(
            (seasonality) => seasonality.month === item.month,
          );
          if (existingSeasonality) {
            existingSeasonality.seasonality = item.seasonality;
            await this.catalogSeasonalityRepository.save(existingSeasonality);
          } else {
            const newSeasonality = this.catalogSeasonalityRepository.create({
              catalog: { id: catalog.id },
              month: item.month,
              seasonality: SeasonalityLevel.HIGH,
            });
            catalog.seasonalities.push(newSeasonality);
            await this.catalogSeasonalityRepository.save(catalog.seasonalities);
          }
        }
      } else {
        const idsToDelete = catalog.seasonalities.map((seasonality) => seasonality.id);
        if (idsToDelete.length > 0) {
          await this.catalogSeasonalityRepository.delete(idsToDelete);
        }
      }
    }

    // Handle Packaging Updates
    const handlePackaging = async (
      hasPackaging: boolean | undefined,
      packagingDetails: any,
      packagingType: PackagingType,
    ) => {
      if (hasPackaging !== undefined) {
        const existingPackaging = catalog.packaging.find(
          (packaging) => packaging.type === packagingType,
        );
        if (hasPackaging && packagingDetails) {
          if (existingPackaging) {
            Object.assign(existingPackaging, {
              Weight: packagingDetails.weight,
              info: packagingDetails.info,
              packagingId: packagingDetails.packagingId,
            });
            await this.catalogPackagingRepository.save(existingPackaging);
          } else {
            const newPackaging = this.catalogPackagingRepository.create({
              catalog,
              packaging: { id: packagingDetails.packagingId },
              weight: packagingDetails.weight,
              info: packagingDetails.info,
              type: packagingType,
            });

            catalog.packaging.push(newPackaging);
            await this.catalogPackagingRepository.save(catalog.packaging);
          }
        } else if (!hasPackaging && existingPackaging) {
          await this.catalogPackagingRepository.delete(existingPackaging);
        }
      }
    };

    await this.catalogRepository.save(catalog);
    await handlePackaging(hasPrimaryPackaging, primaryPackagingDetails, PackagingType.PRIMARY);
    await handlePackaging(
      hasSecondaryPackaging,
      secondaryPackagingDetails,
      PackagingType.SECONDARY,
    );
  }

  async findByIdAndCooperative(id: number, cooperativeId: number): Promise<CatalogDto> {
    const row = await this.catalogRepository.findOne({
      where: { id, cooperative: { id: cooperativeId } },
      relations: ['packaging', 'seasonalities', 'product'],
    });

    if (!row) {
      throw new NotFoundException('Produto não encontrado no seu catálogo');
    }

    return plainToInstance(CatalogDto, row);
  }

  async findAllByCooperative(query: PaginateQuery, cooperativeId: number) {
    const queryBuilder = this.catalogRepository
      .createQueryBuilder('catalog')
      .innerJoin('catalog.cooperative', 'cooperative')
      .leftJoinAndSelect('catalog.product', 'product')
      .leftJoinAndSelect('product.productType', 'productType')
      .leftJoinAndSelect('product.productCategory', 'productCategory')
      .where('cooperative.id = :cooperativeId', { cooperativeId })
      .orderBy('product.name', 'ASC');

    const { filter } = query;

    if (filter && filter.categoryId) {
      queryBuilder.andWhere('productCategory.id = :categoryId', {
        categoryId: filter.categoryId,
      });
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

    const transformedData = plainToInstance(CatalogDto, data);

    return { data: transformedData, ...pagination } as Paginated<CatalogDto>;
  }

  async countByCategory(
    cooperativeId: number,
    filters?: { typeId?: string; name?: string },
  ) {
    const qb = this.catalogRepository
      .createQueryBuilder('catalog')
      .innerJoin('catalog.product', 'product')
      .innerJoin('product.productCategory', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(catalog.id)', 'total')
      .where('catalog.cooperative_id = :cooperativeId', { cooperativeId });

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

  async searchProductsInCatalog(
    name: string,
    adminCooperativeId: number | undefined,
    user: UserLoggedDto,
  ): Promise<ProductDto[]> {
    let where: FindOptionsWhere<Catalog> = {};
    where.product = { name: Like(`%${name}%`) };

    const coopId =
      user.role === UserRole.ADMIN ? adminCooperativeId : await this.resolveCooperativeId(user);

    if (user.role === UserRole.ADMIN && coopId == null) {
      throw new BadRequestException('Administrador deve informar filter.cooperative.id na pesquisa.');
    }

    where.cooperative = { id: Equal(coopId!) };

    const query = await this.catalogRepository.find({
      where,
      relations: ['product'],
      take: 10,
    });

    const transformedData = query.map((catalog) => {
      return catalog.product;
    });

    return plainToInstance(ProductDto, transformedData);
  }

  async removeProductFromCatalog(ìtemId: number, cooperativeId: number) {
    const item = await this.catalogRepository.findOne({
      where: { id: ìtemId, cooperativeId },
      relations: ['product'],
    });

    if (!item) {
      throw new NotFoundException(
        'Produto não encontrado no seu catalogo, não foi possivel remover',
      );
    }

    await this.catalogRepository.softDelete(item.id);
  }
}
