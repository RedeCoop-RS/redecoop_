import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { TravelDto } from '@/travel/Dtos/travel.dto';
import { Travel } from '@/travel/entities/travel.entity';
import { TravelService } from '@/travel/services/travel.service';
import { OfferStatus } from '@/travelOffer/entities/travelOffer.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

@Injectable()
export class ListTravelsUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    private readonly travelService: TravelService,
  ) {}

  async execute(user: UserLoggedDto) {
    const queryBuilder = this.travelRepository
      .createQueryBuilder('travel')
      .leftJoinAndSelect('travel.offers', 'offer')
      .leftJoinAndSelect(
        'travel.travelRoutes',
        'tr',
        'tr.offer.id IS NULL OR offer.status = :statusConfirmed',
        { statusConfirmed: OfferStatus.Confirmed },
      )
      .leftJoinAndSelect('tr.routeProduct', 'rp')
      .leftJoinAndSelect('rp.product', 'product')
      .leftJoinAndSelect('tr.offer', 'routeOffer')
      .leftJoinAndSelect('routeOffer.cooperative','cooperativeOffer')
      .leftJoinAndSelect('routeOffer.cooperative', 'cooperative')
      .leftJoinAndSelect('travel.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.type', 'vt')
      .setParameters({ driverId: user.sub })
      .where('travel.driverId = :driverId')
      .andWhere('travel.deletedAt IS NULL')
      .orderBy('travel.startDateTime', 'DESC')
      .addOrderBy('tr.order', 'ASC')
      .select([
        'travel.id',
        'travel.startDateTime',
        'travel.status',
        'vehicle.licensePlate',
        'vehicle.maximumWeight',
        'vehicle.model',
        'tr.id',
        'tr.address',
        'tr.order',
        'tr.arrivedAt',
        'tr.attachment',
        'tr.loadingWeight',
        'tr.unloadingWeight',
        'tr.offerId',
        'rp.loadedWeight',
        'rp.unloadedWeight',
        'product.id',
        'product.name',
        'vt.name',
        'offer.id',
        'offer.status',
        'routeOffer.id',
        'cooperative.companyName',
        'cooperative.fantasyName',
        'cooperativeOffer.id',
        'cooperativeOffer.companyName',
        'cooperativeOffer.fantasyName'
      ]);

    const travels = await queryBuilder.getMany();

    const travelDtos = await Promise.all(
      plainToInstance(TravelDto, travels).map(async (travel) => {
        const travelIsReadyToStart = await this.travelService.isReadyToStart(travel.id);
        return {
          ...travel,
          readyToStart: travelIsReadyToStart,
        };
      }),
    );

    return travelDtos;
  }
}
