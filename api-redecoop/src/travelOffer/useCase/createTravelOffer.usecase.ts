import { BadRequestException, Injectable } from '@nestjs/common';
import { OfferStatus, TravelOffer } from '../entities/travelOffer.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel } from '@/travel/entities/travel.entity';
import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { MapsService } from '@/maps/maps.service';
import { CreateTravelOfferDto, StopOfferDto } from '../Dtos/createOfferTravel.dto';
import { TravelOfferService } from '../travelOffer.service';
import { NotificationService } from '@/notification/notification.service';
import { NotificationType } from '@/notification/entities/notification.entity';
import { NotificationMessages } from '@/notification/notification-messages';
import { Transactional } from 'typeorm-transactional';
import { TravelRouteProduct } from '@/travel/entities/travelRouteProduct.entity';
import { BusinessService } from '@/business/services/business.service';

@Injectable()
export class CreateTravelOfferUseCase {
  constructor(
    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
    @InjectRepository(TravelRouteProduct)
    private readonly travelRouteProductRepository: Repository<TravelRouteProduct>,
    private readonly mapsService: MapsService,
    private readonly travelOfferService: TravelOfferService,
    private readonly notificationService: NotificationService,
    private readonly businessService: BusinessService,
  ) {}

  @Transactional()
  async execute(data: CreateTravelOfferDto, cooperativeId: number) {
    const { stops, initialMessage, travelId } = data;

    if (await this.travelOfferService.offerExists(travelId, cooperativeId)) {
      throw new BadRequestException(
        'Você já enviou uma oferta para essa viagem, verifique suas viagens para saber mais.',
      );
    }

    const travel = await this.travelRepository.findOne({
      where: { id: travelId },
      relations: { vehicle: true, travelRoutes: true },
    });

    if (!travel) {
      throw new BadRequestException('Viagem não encontrada ou não está mais recebendo ofertas.');
    }

    if (travel.cooperativeId == cooperativeId) {
      throw new BadRequestException('Você não pode enviar uma oferta para si mesmo.');
    }

    if (await this.travelOfferService.offerExists(travelId, cooperativeId)) {
      throw new BadRequestException(
        'Você já enviou uma oferta para essa viagem, verifique suas viagens para saber mais.',
      );
    }

    const offer = await this.travelOfferRepository.save(
      this.travelOfferRepository.create({
        travel,
        status: OfferStatus.Awaiting,
        cooperative: { id: cooperativeId },
      }),
    );

    await this.travelOfferService.validateStops(stops, travel.vehicle.maximumWeight, cooperativeId);

    let index = 0;
    let totalDistance = 0;
    for (const stop of stops) {
      let distance = 0;

      const loadingWeight = stop.productsLoad.reduce((sum, product) => sum + product.weight, 0);
      const unloadingWeight = stop.productsUnload.reduce((sum, product) => sum + product.weight, 0);

      if (index !== 0) {
        distance = await this.mapsService.getRouteDistance(
          [stops[index - 1].coordinates.longitude, stops[index - 1].coordinates.latitude],
          [stop.coordinates.longitude, stop.coordinates.latitude],
        );
      }

      totalDistance += distance;

      const route = await this.travelRouteRepository.save(
        this.travelRouteRepository.create({
          address: stop.address,
          latitude: stop.coordinates.latitude,
          longitude: stop.coordinates.longitude,
          travel,
          offer,
          loadingWeight,
          unloadingWeight,
          distance,
          order: index + 1,
        }),
      );

      for (const productLoad of stop.productsLoad) {
        await this.travelRouteProductRepository.save(
          this.travelRouteProductRepository.create({
            productId: productLoad.productId,
            loadedWeight: productLoad.weight,
            route,
          }),
        );
      }

      for (const productUnload of stop.productsUnload) {
        await this.travelRouteProductRepository.save(
          this.travelRouteProductRepository.create({
            productId: productUnload.productId,
            unloadedWeight: productUnload.weight,
            route,
          }),
        );
      }

      index++;
    }

    const productsLoad = stops.map((stop) => stop.productsLoad).flat();
    const fee = await this.travelOfferService.calculateTravelFee(
      totalDistance,
      productsLoad,
      travel.vehicleId,
    );
    await this.businessService.createBusiness({
      requestingCooperativeId: cooperativeId,
      offeringCooperativeId: travel.cooperativeId,
      travelOffer: offer,
      fee,
      initialMessage: initialMessage
        ? initialMessage
        : 'Estou interessado em participar desta viagem',
    });

    await this.notificationService.sendNotification(
      NotificationType.TRAVEL_OFFER,
      NotificationMessages.NEW_PROPOSAL_TRAVEL(travel.startDateTime),
      travel.cooperativeId,
    );
  }
}
