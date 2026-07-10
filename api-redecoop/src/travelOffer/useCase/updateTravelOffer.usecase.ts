import { BadRequestException, Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { UpdateOfferTravelDto } from '../Dtos/updateOfferTravel.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OfferStatus, TravelOffer } from '../entities/travelOffer.entity';
import { Repository } from 'typeorm';
import { TravelOfferService } from '../travelOffer.service';
import { UserRole } from '@/User/entities/user.entity';
import { MapsService } from '@/maps/maps.service';
import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { TravelRouteProduct } from '@/travel/entities/travelRouteProduct.entity';
import { NotificationService } from '@/notification/notification.service';
import { NotificationType } from '@/notification/entities/notification.entity';
import { NotificationMessages } from '@/notification/notification-messages';
import { Business } from '@/business/entities/business.entity';
import { TravelStatus } from '@/travel/entities/travel.entity';

@Injectable()
export class UpdateTravelOfferUseCase {
  constructor(
    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
    @InjectRepository(TravelRouteProduct)
    private readonly travelRouteProductRepository: Repository<TravelRouteProduct>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly travelOfferService: TravelOfferService,
    private readonly mapsService: MapsService,
    private readonly notificationService: NotificationService,
  ) {}

  @Transactional()
  async execute(id: number, updateData: UpdateOfferTravelDto, user: UserLoggedDto) {
    const offer = await this.travelOfferRepository.findOne({
      where: { id },
      relations: { business: true, routes: true, travel: { vehicle: true } },
    });

    if (!offer) {
      throw new BadRequestException('Oferta não encontrada.');
    }

    if (offer.cooperativeId !== user.sub && user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Você não tem permissão para editar essa oferta');
    }

    if (offer.status === OfferStatus.Rejected) {
      throw new BadRequestException(
        'Você não pode mais alterar essa oferta pois ela foi rejeitada envie outra.',
      );
    }

    if (
      offer.status === OfferStatus.Confirmed ||
      offer.status === OfferStatus.ConfirmedPendingRoutes
    ) {
      throw new BadRequestException(
        'Você não pode mais alterar essa oferta pois ela ja foi aceita.',
      );
    }

    if (
      offer.travel.status === TravelStatus.InProgress ||
      offer.travel.status === TravelStatus.Completed
    ) {
      throw new BadRequestException(
        'Você não pode mais alterar essa oferta pois a viagem esta em progresso ou foi finalizada.',
      );
    }

    if (offer.travel.status === TravelStatus.Canceled) {
      throw new BadRequestException(
        'Você não pode mais alterar essa oferta pois a viagem foi cancelada.',
      );
    }

    const changelog = { title: 'A Proposta foi <b>alterada</b>', createdAt: new Date() };
    offer.changelogs = Array.isArray(offer.changelogs) ? offer.changelogs : [];
    offer.changelogs = [...offer.changelogs, changelog];

    await this.travelOfferRepository.save(offer);

    const { stops } = updateData;

    await this.travelOfferService.validateStops(
      stops,
      offer.travel.vehicle.maximumWeight,
      offer.cooperativeId,
    );

    const updatedRouteIds = stops.map((stop) => stop.routeId);
    const routesToRemove = offer.routes.filter((route) => !updatedRouteIds.includes(route.id));

    if (routesToRemove.length > 0) {
      await this.travelRouteRepository.remove(routesToRemove);
    }

    const existingRoutes = offer.routes.reduce((acc, route) => {
      acc[route.id] = route;
      return acc;
    }, {});

    let totalDistance = 0;
    let index = 0;
    for (const stop of stops) {
      let distance = 0;

      if (index !== 0) {
        distance = await this.mapsService.getRouteDistance(
          [stops[index - 1].coordinates.longitude, stops[index - 1].coordinates.latitude],
          [stop.coordinates.longitude, stop.coordinates.latitude],
        );
      }

      totalDistance += distance;

      const loadingWeight = stop.productsLoad.reduce((sum, product) => sum + product.weight, 0);
      const unloadingWeight = stop.productsUnload.reduce((sum, product) => sum + product.weight, 0);

      let updatedOrNewRoute: TravelRoute;
      if (existingRoutes[stop.routeId]) {
        const route = existingRoutes[stop.routeId] as TravelRoute;
        route.distance = distance;
        route.latitude = stop.coordinates.latitude;
        route.longitude = stop.coordinates.longitude;
        route.address = stop.address;
        route.loadingWeight = loadingWeight;
        route.unloadingWeight = unloadingWeight;
        route.order = index + 1;
        updatedOrNewRoute = await this.travelRouteRepository.save(route);
      } else {
        const newRoute = this.travelRouteRepository.create({
          distance,
          latitude: stop.coordinates.latitude,
          longitude: stop.coordinates.longitude,
          address: stop.address,
          loadingWeight,
          unloadingWeight,
          order: index + 1,
          offer: offer,
          travelId: offer.travel.id,
        });
        updatedOrNewRoute = await this.travelRouteRepository.save(newRoute);
      }
      for (const productLoad of stop.productsLoad) {
        const existingProductRoute = await this.travelRouteProductRepository.findOne({
          where: { productId: productLoad.productId, route: { id: updatedOrNewRoute.id } },
        });

        if (existingProductRoute) {
          existingProductRoute.loadedWeight = productLoad.weight;
          await this.travelRouteProductRepository.save(existingProductRoute);
        } else {
          await this.travelRouteProductRepository.save(
            this.travelRouteProductRepository.create({
              productId: productLoad.productId,
              loadedWeight: productLoad.weight,
              route: updatedOrNewRoute,
            }),
          );
        }
      }

      for (const productUnload of stop.productsUnload) {
        const existingProductRoute = await this.travelRouteProductRepository.findOne({
          where: { productId: productUnload.productId, route: { id: updatedOrNewRoute.id } },
        });

        if (existingProductRoute) {
          existingProductRoute.unloadedWeight = productUnload.weight;
          await this.travelRouteProductRepository.save(existingProductRoute);
        } else {
          await this.travelRouteProductRepository.save(
            this.travelRouteProductRepository.create({
              productId: productUnload.productId,
              unloadedWeight: productUnload.weight,
              route: updatedOrNewRoute,
            }),
          );
        }
      }

      index++;
    }

    const productsLoad = stops.map((stop) => stop.productsLoad).flat();
    const fee = await this.travelOfferService.calculateTravelFee(
      totalDistance,
      productsLoad,
      offer.travel.vehicleId,
    );

    await this.businessRepository.update({ id: offer.business.id }, { fee });

    //Enviar Notificação
    await this.notificationService.sendNotification(
      NotificationType.TRAVEL_OFFER,
      NotificationMessages.PROPOSAL_TRAVEL_MODIFIED(offer.travel.startDateTime),
      offer.travel.cooperativeId,
    );
  }
}
