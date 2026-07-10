import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel, TravelStatus } from '../entities/travel.entity';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { TravelRouteService } from '../services/travelRoute.service';
import { OfferStatus } from '@/travelOffer/entities/travelOffer.entity';
import { plainToInstance } from 'class-transformer';
import { TravelDto } from '../Dtos/travel.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class GetAvailableTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    private readonly travelRouteService: TravelRouteService,
  ) {}

  async execute(query: PaginateQuery, user: UserLoggedDto) {
    const { filter } = query;

    const statusFilterRaw = filter?.status;
    const statusFilter = Array.isArray(statusFilterRaw) ? statusFilterRaw[0] : statusFilterRaw;
    const isAdmin = user.role === UserRole.ADMIN;

    let travelStatus = TravelStatus.Awaiting;
    if (isAdmin && statusFilter === TravelStatus.Completed) {
      travelStatus = TravelStatus.Completed;
    }

    const queryBuilder = this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.type', 'vehicleType')
      .leftJoinAndSelect('travel.travelRoutes', 'travelRoutes')
      .leftJoinAndSelect('travelRoutes.offer', 'offer')
      .where('travel.status = :status', { status: travelStatus })
      .select([
        'travel.id',
        'travel.cooperativeId',
        'travel.startDateTime',
        'travel.status',
        'travel.completedAt',
        'travelRoutes.id',
        'travelRoutes.address',
        'travelRoutes.loadingWeight',
        'travelRoutes.unloadingWeight',
        'travelRoutes.order',
        'vehicle.id',
        'vehicleType.id',
        'vehicleType.name',
        'vehicle.maximumWeight',
      ])
      .orderBy('travel.startDateTime', 'DESC');

    if (travelStatus === TravelStatus.Awaiting) {
      queryBuilder.andWhere('(offer.status IS NULL OR offer.status = :offerStatus)', {
        offerStatus: OfferStatus.Confirmed,
      });
    }

    if (filter && filter.startDateTime) {
      const [start, end] = filter.startDateTime.split(',');
      queryBuilder.andWhere('travel.startDateTime BETWEEN :start AND :end', { start, end });
    }

    if (filter && filter.vehicleTypeId) {
      queryBuilder.andWhere('vehicleType.id = :vehicleTypeId', {
        vehicleTypeId: filter.vehicleTypeId,
      });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    for (let index = 0; index < data.length; index++) {
      const travel = data[index];
      const maxCapacity = travel.vehicle.maximumWeight;

      const remainingCapacities = await this.travelRouteService.calculateAvailableLoad(
        travel.travelRoutes,
        maxCapacity,
      );

      travel.travelRoutes = travel.travelRoutes.map((route, routeIndex) => ({
        ...route,
        remainingCapacity: remainingCapacities[routeIndex],
      }));
    }

    const transformedData = plainToInstance(TravelDto, data);

    return {
      data: transformedData,
      ...pagination,
    } as Paginated<TravelDto>;
  }
}
