import { Injectable } from '@nestjs/common';
import { CollectivePurchase } from '../entities/collectivePurchase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { plainToInstance } from 'class-transformer';
import { CollectivePruchaseDto } from '../Dtos/collectivePurchase.dto';

@Injectable()
export class ListCollectivePurchaseUseCase {
  constructor(
    @InjectRepository(CollectivePurchase)
    private readonly collectivePurchaseRepository: Repository<CollectivePurchase>,
  ) {}

  async execute(query: PaginateQuery) {
    const queryBuilder = this.collectivePurchaseRepository
      .createQueryBuilder('collectivePurchase')
      .leftJoinAndSelect('collectivePurchase.city', 'city')
      .leftJoinAndSelect('city.state', 'state')
      .orderBy('collectivePurchase.createdAt', 'DESC');

    const { filter } = query;

    if (filter && filter.createdAt) {
      const [start, end] = filter.createdAt.split(',');
      queryBuilder.andWhere('collectivePurchase.createdAt BETWEEN :start AND :end', { start, end });
    }

    if (filter && filter.showInactive === 'true') {
      queryBuilder.andWhere('collectivePurchase.active IN (:...status)', { status: [true, false] });
    } else {
      queryBuilder.andWhere('collectivePurchase.active = :active', { active: true });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformedData = plainToInstance(CollectivePruchaseDto, data);

    return { data: transformedData, ...pagination };
  }
}
