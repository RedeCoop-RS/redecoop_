import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel, TravelStatus } from '../entities/travel.entity';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { TravelDto } from '../Dtos/travel.dto';

@Injectable()
export class GetMyTravelsUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  async execute(query: PaginateQuery, user: UserLoggedDto) {
    const queryBuilder = this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.cooperative', 'travelCooperative')
      .leftJoinAndSelect('travel.offers', 'travelOffer')
      .leftJoinAndSelect('travel.travelRoutes', 'travelRoute')
      .loadRelationCountAndMap('travel.offerCount', 'travel.offers')
      .setParameter('cooperativeId', user.sub)
      .select([
        'travel.id',
        'travel.startDateTime',
        'travel.status',
        'travelCooperative.id',
        'travel.cooperativeId',
        'travelRoute.id',
        'travelRoute.distance',
        'travelRoute.address',
        'travelRoute.latitude',
        'travelRoute.longitude',
        'travelRoute.loadingWeight',
        'travelRoute.unloadingWeight',
        'travelRoute.order',
        'travelOffer.cooperativeId',
        'travel.createdAt',
      ])
      .orderBy({
        'travel.startDateTime': 'DESC',
      });

    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere(
        '(travel.cooperative.id = :cooperativeId OR (travel.cooperative.id != :cooperativeId AND travelOffer.cooperative.id = :cooperativeId))',
      );
    }

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

    if (filter && filter.type === 'offerer') {
      queryBuilder.andWhere('travel.cooperative.id = :cooperativeId');
    }

    if (filter && filter.type === 'participant') {
      queryBuilder.andWhere('travel.cooperative.id != :cooperativeId');
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
        isOffer: travel.cooperative.id === user.sub,
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
