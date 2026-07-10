import { Injectable } from '@nestjs/common';
import { Travel, TravelStatus } from '../entities/travel.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { plainToInstance } from 'class-transformer';
import { TravelDto } from '../Dtos/travel.dto';

@Injectable()
export class GetTravelsUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}
  async execute(query: PaginateQuery) {
    const queryBuilder = this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.cooperative', 'travelCooperative')
      .leftJoinAndSelect('travel.offers', 'travelOffer')
      .leftJoinAndSelect('travelOffer.cooperative', 'offerCooperative')
      .leftJoinAndSelect('travel.travelRoutes', 'travelRoute')
      .loadRelationCountAndMap('travel.offerCount', 'travel.offers')
      .select([
        'travel.id',
        'travel.startDateTime',
        'travel.status',
        'travelCooperative.id',
        'travelCooperative.companyName',
        'travelCooperative.fantasyName',
        'travelRoute.id',
        'travelRoute.distance',
        'travelRoute.address',
        'travelRoute.latitude',
        'travelRoute.longitude',
        'travelRoute.loadingWeight',
        'travelRoute.unloadingWeight',
        'travelRoute.order',
        'offerCooperative.id',
        'travel.createdAt',
      ])
      .orderBy({
        'travel.startDateTime': 'DESC',
      });

    const { filter } = query;

    if (filter && filter.startDateTime) {
      if (typeof filter.startDateTime === 'string') {
        const [startDate, endDate] = filter.startDateTime.split(',');
        queryBuilder.andWhere('travel.startDateTime BETWEEN :startDate AND :endDate', {
          startDate: startDate,
          endDate: endDate,
        });
      }
    }

    const completedCount = await queryBuilder
      .clone()
      .andWhere('travel.status = :cStatus', { cStatus: TravelStatus.Completed })
      .getCount();
    const openCount = await queryBuilder
      .clone()
      .andWhere('travel.status = :oStatus', { oStatus: TravelStatus.Awaiting })
      .getCount();

    const notFinishedRaw = filter?.['notfinished'] ?? filter?.['notFinished'];
    const notFinishedOn =
      notFinishedRaw === 'true' ||
      notFinishedRaw === true ||
      (Array.isArray(notFinishedRaw) && notFinishedRaw[0] === 'true');

    if (notFinishedOn) {
      queryBuilder.andWhere('travel.status != :travelStatus', {
        travelStatus: TravelStatus.Completed,
      });
    }

    const statusRaw = filter?.['status'];
    const statusFilter = Array.isArray(statusRaw) ? statusRaw[0] : statusRaw;
    if (statusFilter === TravelStatus.Completed) {
      queryBuilder.andWhere('travel.status = :onlyStatus', { onlyStatus: TravelStatus.Completed });
    } else if (statusFilter === TravelStatus.Awaiting) {
      queryBuilder.andWhere('travel.status = :onlyStatus', { onlyStatus: TravelStatus.Awaiting });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformedData = plainToInstance(TravelDto, data).map((travel) => {
      if (travel.travelRoutes) {
        travel.travelRoutes.sort((a, b) => a.order - b.order);
      }

      return {
        ...travel,
      };
    });

    const totalStatus = {
      completedCount,
      openCount,
    };

    return {
      data: transformedData,
      ...totalStatus,
      ...pagination,
    } as Paginated<TravelDto>;
  }
}
