import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { Business, BusinessStatus } from '@/business/entities/business.entity';
import { CooperativeDebitService } from '@/cooperativeDebit/cooperativeDebit.service';
import { Travel, TravelStatus } from '@/travel/entities/travel.entity';
import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { OfferStatus, TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class MarkArrivalRouteUseCase {
  constructor(
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly debitService: CooperativeDebitService,
  ) {}

  @Transactional()
  async execute(travelRouteId: number, user: UserLoggedDto) {
    const travelRoute = await this.travelRouteRepository.findOne({
      where: { id: travelRouteId },
      relations: { travel: { travelRoutes: true, driver: true } },
    });

    if (!travelRoute) {
      throw new NotFoundException('Rota não encontrada no trajeto');
    }

    if (travelRoute.travel.driver.id !== user.sub) {
      throw new BadRequestException(
        'Você não é o motorista da viagem, não foi possivel confirmar sua chegada.',
      );
    }

    if (travelRoute.travel.status !== TravelStatus.InProgress) {
      throw new BadRequestException(
        'Não é possível confirmar a chegada, pois a viagem ainda não começou.',
      );
    }

    travelRoute.arrivedAt = new Date();

    await this.travelRouteRepository.save(travelRoute);

    const { travelRoutes, id: travelId } = await this.travelRepository.findOneOrFail({
      where: { id: travelRoute.travel.id },
      relations: { travelRoutes: true },
    });

    if (travelRoutes.every((route) => route.arrivedAt)) {
      await this.travelRepository.update(travelId, { status: TravelStatus.Completed });

      const travelOffers = await this.travelOfferRepository.find({
        where: { travel: { id: travelId }, status: OfferStatus.Confirmed },
        relations: { business: true },
      });

      if (travelOffers && travelOffers.length > 0) {
        for (const offer of travelOffers) {
          const business = await this.businessRepository.findOneBy({ id: offer.business.id });
          await this.debitService.addDebit({
            cooperativeId: business.requestingCooperativeId,
            businessId: business.id,
          });
          business.status = BusinessStatus.Done;
          await this.businessRepository.save(business)
        }
      }
    }
  }
}
