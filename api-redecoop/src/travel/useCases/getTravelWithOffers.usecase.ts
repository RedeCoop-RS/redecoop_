import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel } from '../entities/travel.entity';
import { plainToInstance } from 'class-transformer';
import { TravelDto } from '../Dtos/travel.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { Repository } from 'typeorm';
import { OfferStatus } from '@/travelOffer/entities/travelOffer.entity';

@Injectable()
export class GetTravelWithOffersUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  async execute(id: number, user: UserLoggedDto) {
    const queryBuilder = this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.offers', 'offers')
      .leftJoinAndSelect('travel.driver', 'driver')
      .leftJoinAndSelect('travel.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.type', 'vehicleType')
      .leftJoinAndSelect('travel.travelRoutes', 'route')
      .leftJoinAndSelect('route.offer', 'offer')
      .leftJoinAndSelect('offer.cooperative', 'cooperative')
      .leftJoinAndSelect('route.routeProduct', 'routeProduct')
      .leftJoinAndSelect('routeProduct.product', 'product')
      .leftJoinAndSelect('offers.business', 'business')
      .andWhere('travel.id = :travelId', { travelId: id })
      .select([
        'travel.id',
        'travel.status',
        'travel.startDateTime',
        'travel.cooperativeId',
        'route.id',
        'route.address',
        'route.distance',
        'route.order',
        'route.offerId',
        'route.coopAttachment',
        'route.loadingWeight',
        'route.unloadingWeight',
        'offer.id',
        'offer.cooperativeId',
        'offer.status',
        'cooperative.id',
        'cooperative.companyName',
        'cooperative.fantasyName',
        'routeProduct.id',
        'routeProduct.loadedWeight',
        'routeProduct.unloadedWeight',
        'product.id',
        'product.name',
        'offers.id',
        'offers.totalDistance',
        'offers.status',
        'offers.cooperativeId',
        'driver.id',
        'driver.name',
        'vehicle.maximumWeight',
        'vehicleType.name',
        'business.id',
        'business.fee',
      ]);

    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere(
        '(travel.cooperativeId = :cooperativeId OR offers.cooperativeId = :cooperativeId)',
        { cooperativeId: user.sub },
      );
    }

    const travel = await queryBuilder.getOne();

    if (!travel) {
      throw new NotFoundException('Viagem não encontrada, ou não esta mais disponivel');
    }

    if (user.role !== UserRole.ADMIN) {
      travel.travelRoutes = (travel.travelRoutes ?? []).filter((route) => {
        if (!route.offerId) return true;
        if (route.offer?.status === OfferStatus.Confirmed) return true;
        return route.offer?.cooperativeId === user.sub;
      });
    }

    return plainToInstance(TravelDto, travel);
  }
}
