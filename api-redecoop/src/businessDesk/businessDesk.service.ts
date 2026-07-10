import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessDesk } from './entities/businessDesk.entity';
import { plainToInstance } from 'class-transformer';
import { BusinessDeskDto } from './Dtos/businessDesk.dto';
import { CreateBusinessDeskDto } from './Dtos/createBusinessDesk.dto';
import { UpdateBusinessDeskDto } from './Dtos/updateBusinessDesk.dto';
import { StartContactBusinessDeskDto } from './Dtos/startContactBusinessDesk.dto';
import { BusinessService } from '@/business/services/business.service';
import { BusinessDeskProductService } from '@/businessDeskProduct/businessDeskProduct.service';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';

@Injectable()
export class BusinessDeskService {
  constructor(
    @InjectRepository(BusinessDesk)
    private readonly businessDeskRepository: Repository<BusinessDesk>,
    private readonly businessDeskProductService: BusinessDeskProductService,
    private readonly businessService: BusinessService,
  ) {}

  @Transactional()
  async create(data: CreateBusinessDeskDto, cooperativeId: number) {
    const { description, catalogProducts } = data;

    const newBusinessDesk = this.businessDeskRepository.create({
      description,
      cooperative: { id: cooperativeId },
    });

    const businessDesk = await this.businessDeskRepository.save(newBusinessDesk);
    await this.businessDeskProductService.saveBusinessDeskProduct(businessDesk, catalogProducts);
  }

  @Transactional()
  async update(id: number, data: UpdateBusinessDeskDto, user: UserLoggedDto) {
    const { description, catalogProducts, active } = data;

    const businessDesk = await this.businessDeskRepository.findOne({
      where: { id },
      relations: ['businessDeskProducts', 'businessDeskProducts.product'],
    });

    if (!businessDesk) {
      throw new NotFoundException(`Balcão de negócio com ID ${id} não encontrado`);
    }

    if (user.role !== UserRole.ADMIN && businessDesk.cooperativeId !== user.sub) {
      throw new BadRequestException('Você não pode alterar essa oportunidade.');
    }

    if (description) {
      businessDesk.description = description;
    }

    if (businessDesk.deletedAt) {
      throw new BadRequestException('Esta oportunidade foi removida e não pode ser alterada.');
    }

    if (active !== undefined) {
      businessDesk.active = active;
    }
    if (catalogProducts) {
      await this.businessDeskProductService.updateBusinessDeskProduct(
        businessDesk,
        catalogProducts,
      );
    }
  }

  async findAll(
    query: PaginateQuery,
    user?: UserLoggedDto,
  ): Promise<Paginated<BusinessDeskDto>> {
    const queryBuilder = this.businessDeskRepository
      .createQueryBuilder('bnDesk')
      .leftJoinAndSelect('bnDesk.cooperative', 'cooperative')
      .leftJoinAndSelect('cooperative.city', 'city')
      .leftJoinAndSelect('bnDesk.businessDeskProducts', 'businessDeskProducts')
      .leftJoinAndSelect('businessDeskProducts.product', 'product')
      .select([
        'bnDesk.id',
        'bnDesk.description',
        'bnDesk.createdAt',
        'bnDesk.cooperativeId',
        'bnDesk.active',
        'bnDesk.deletedAt',
        'cooperative.id',
        'cooperative.companyName',
        'cooperative.fantasyName',
        'city.id',
        'city.name',
        'product.id',
        'product.name',
        'businessDeskProducts.id',
        'businessDeskProducts.weight',
      ]).orderBy('bnDesk.createdAt','DESC')

    const { filter } = query;

    if (filter && filter.createdAt) {
      const [start, end] = filter.createdAt.split(',');
      queryBuilder.andWhere('bnDesk.createdAt BETWEEN :start AND :end', { start, end });
    }

    const showInactive = filter && filter.showInactive === 'true';
    const showDeleted = filter && filter.showDeleted === 'true';
    const canListDeleted = user?.role === UserRole.ADMIN && showDeleted;

    if (!canListDeleted) {
      queryBuilder.andWhere('bnDesk.deletedAt IS NULL');
    }

    if (canListDeleted) {
      if (!showInactive) {
        queryBuilder.andWhere(
          '(bnDesk.deletedAt IS NOT NULL OR bnDesk.active = :activeTrue)',
          { activeTrue: true },
        );
      }
    } else if (showInactive) {
      queryBuilder.andWhere('bnDesk.active IN (:...status)', { status: [true, false] });
    } else {
      queryBuilder.andWhere('bnDesk.active = :active', { active: true });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;
    const transformedData = plainToInstance(BusinessDeskDto, data);
    return { data: transformedData, ...pagination } as Paginated<BusinessDeskDto>;
  }

  async findById(id: number, user?: UserLoggedDto) {
    let queryBuilder = this.businessDeskRepository
      .createQueryBuilder('bnDesk')
      .leftJoinAndSelect('bnDesk.cooperative', 'cooperative')
      .leftJoinAndSelect('cooperative.city', 'city')
      .leftJoinAndSelect('bnDesk.businessDeskProducts', 'businessDeskProducts')
      .leftJoinAndSelect('businessDeskProducts.product', 'product')
      .select([
        'bnDesk.id',
        'bnDesk.description',
        'bnDesk.createdAt',
        'bnDesk.cooperativeId',
        'bnDesk.active',
        'bnDesk.deletedAt',
        'cooperative.id',
        'cooperative.companyName',
        'cooperative.fantasyName',
        'cooperative.img',
        'city.id',
        'city.name',
        'product.id',
        'product.name',
        'businessDeskProducts.id',
        'businessDeskProducts.weight',
      ])
      .where('bnDesk.id = :id', { id });

    const businessDesk = await queryBuilder.getOne();

    if (!businessDesk) {
      throw new NotFoundException(`Nenhum balcão de negócio encontrado com o ID ${id}`);
    }

    if (businessDesk.deletedAt && user?.role !== UserRole.ADMIN) {
      throw new NotFoundException(`Nenhum balcão de negócio encontrado com o ID ${id}`);
    }

    return plainToInstance(BusinessDeskDto, businessDesk);
  }

  async softDeleteByAdmin(id: number): Promise<void> {
    const row = await this.businessDeskRepository.findOneBy({ id });
    if (!row) {
      throw new NotFoundException(`Balcão de negócio com ID ${id} não encontrado`);
    }
    if (row.deletedAt) {
      throw new BadRequestException('Esta oportunidade já foi excluída.');
    }
    row.deletedAt = new Date();
    row.active = false;
    await this.businessDeskRepository.save(row);
  }

  @Transactional()
  async startContact(data: StartContactBusinessDeskDto, cooperativeId: number): Promise<void> {
    const { businessDeskId, initialMessage } = data;

    const businessDesk = await this.businessDeskRepository.findOne({
      where: { id: businessDeskId },
      relations: ['business'],
    });

    if (!businessDesk) {
      throw new NotFoundException(
        `Oportunidade #${businessDeskId} não encontrada no balcão de negócios`,
      );
    }

    if (!businessDesk.active) {
      throw new BadRequestException('Oportunidade não está mais disponível');
    }

    if (businessDesk.deletedAt) {
      throw new BadRequestException('Oportunidade não está mais disponível');
    }

    if (businessDesk.cooperativeId === cooperativeId) {
      throw new BadRequestException('Você não pode negóciar sua própria oportunidade');
    }

    const existsBusiness = businessDesk.business.some(
      (business) => business.requestingCooperativeId === cooperativeId,
    );

    if (existsBusiness) {
      throw new BadRequestException('Você já tem uma negociação em aberto para essa oportunidade.');
    }

    await this.businessService.createBusiness({
      requestingCooperativeId: cooperativeId,
      offeringCooperativeId: businessDesk.cooperativeId,
      initialMessage,
      businessDesk,
    });
  }
}
