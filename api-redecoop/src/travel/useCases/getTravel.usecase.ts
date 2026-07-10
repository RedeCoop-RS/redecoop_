import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Travel } from '../entities/travel.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus } from '@/travelOffer/entities/travelOffer.entity';
import { TravelRouteService } from '../services/travelRoute.service';
import { plainToInstance } from 'class-transformer';
import { TravelDto } from '../Dtos/travel.dto';

@Injectable()
export class GetTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    private readonly travelRouteService: TravelRouteService,
  ) {}

  async execute(id: number) {
    const queryBuilder = this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.travelRoutes', 'travelRoute')
      .leftJoinAndSelect('travelRoute.offer', 'routeOffer')
      .leftJoinAndSelect('travel.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.type', 'vehicleType')
      .leftJoinAndSelect('travel.cooperative', 'cooperative')
      .leftJoinAndSelect('travel.driver', 'driver')
      .where('travel.id = :travelId', { travelId: id })
      .andWhere('(routeOffer.status IS NULL OR routeOffer.status = :offerStatus)', {
        offerStatus: OfferStatus.Confirmed,
      })
      .select([
        'travel.id',
        'travel.startDateTime',
        'travel.status',
        'travel.cooperativeId',
        'travel.vehicleId',
        'travel.driverId',
        'travelRoute.id',
        'travelRoute.distance',
        'travelRoute.address',
        'travelRoute.latitude',
        'travelRoute.longitude',
        'travelRoute.loadingWeight',
        'travelRoute.unloadingWeight',
        'travelRoute.order',
        'cooperative.id',
        'cooperative.companyName',
        'cooperative.fantasyName',
        'vehicle.id',
        'vehicle.maximumWeight',
        'vehicleType.name',
        'driver.id',
        'travel.createdAt',
      ])
      .orderBy('travelRoute.order', 'ASC');

    const travel = await queryBuilder.getOne();

    if (!travel) {
      throw new NotFoundException('Nenhuma viagem encontrada');
    }

    const remainingCapacities = await this.travelRouteService.calculateAvailableLoad(
      travel.travelRoutes,
      travel.vehicle.maximumWeight,
    );

    travel.travelRoutes = travel.travelRoutes.map((route, routeIndex) => ({
      ...route,
      remainingCapacity: remainingCapacities[routeIndex],
    }));

    return plainToInstance(TravelDto, travel);
  }
}
