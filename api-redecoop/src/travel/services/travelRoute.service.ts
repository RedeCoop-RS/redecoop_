import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TravelRoute } from '../entities/travelRoute.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AdjustRouteOrder } from '../Dtos/adjustOrderTravelRoute.dto';
import { Travel } from '../entities/travel.entity';
import { OfferStatus, TravelOffer } from '../../travelOffer/entities/travelOffer.entity';
import { MapsService } from '@/maps/maps.service';
import { Transactional } from 'typeorm-transactional';
import { plainToInstance } from 'class-transformer';
import { TravelRouteDto } from '../Dtos/travelRoute.dto';

@Injectable()
export class TravelRouteService {
  constructor(
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
    private readonly mapsService: MapsService,
  ) {}

  // Retorna rotas ativas com ofertas confirmadas ou pendentes
  async finalRoutesWithProposal(travelId: number) {
    const routes = await this.travelRouteRepository
      .createQueryBuilder('TR')
      .leftJoinAndSelect('TR.offer', 'offer')
      .leftJoinAndSelect('TR.routeProduct', 'routeProduct')
      .leftJoinAndSelect('routeProduct.product', 'product')
      .leftJoinAndSelect('offer.cooperative', 'cooperative')
      .where('TR.travel.id = :travelId', { travelId })
      .andWhere('TR.deletedAt IS NULL')
      .andWhere(
        '(offer.status IS NULL OR offer.status = :statusConfirmed OR offer.status = :status)',
        {
          status: OfferStatus.ConfirmedPendingRoutes,
          statusConfirmed: OfferStatus.Confirmed,
        },
      )
      .select([
        'TR.id',
        'TR.address',
        'TR.latitude',
        'TR.longitude',
        'TR.order',
        'TR.distance',
        'TR.loadingWeight',
        'TR.unloadingWeight',
        'offer.id',
        'cooperative.id',
        'cooperative.companyName',
        'cooperative.fantasyName',
        'routeProduct.loadedWeight',
        'routeProduct.unloadedWeight',
        'product.name',
      ])
      .orderBy('TR.order', 'ASC')
      .getMany();

    return plainToInstance(TravelRouteDto, routes, { excludeExtraneousValues: true });
  }

  @Transactional()
  async adjustRouteOrder(travelId: number, data: AdjustRouteOrder[]) {
    const travelRoutes = await this.travelRouteRepository.find({
      where: { travel: { id: travelId }, deletedAt: null },
      relations: { offer: true },
    });

    if (!travelRoutes.length) {
      throw new BadRequestException('Viagem não encontrada ou já deletada');
    }

    let previousRoute: TravelRoute = null;

    for (const routeData of data) {
      const existingRoute = travelRoutes.find((r) => r.id === routeData.id);

      if (!existingRoute) {
        throw new BadRequestException(`Rota não encontrada com o ID: ${routeData.id}`);
      }

      existingRoute.order = routeData.order;

      if (existingRoute.order === 1) {
        existingRoute.distance = 0;
      } else if (previousRoute) {
        try {
          existingRoute.distance = await this.mapsService.getRouteDistance(
            [Number(previousRoute.longitude), Number(previousRoute.latitude)],
            [Number(existingRoute.longitude), Number(existingRoute.latitude)],
          );
        } catch {
          throw new BadRequestException(
            `Erro ao calcular distância entre rotas de ordem ${previousRoute.order} e ${existingRoute.order}`,
          );
        }
      }

      // Atualiza status da oferta se necessário
      if (
        existingRoute.offer &&
        existingRoute.offer.status === OfferStatus.ConfirmedPendingRoutes
      ) {
        existingRoute.offer.status = OfferStatus.Confirmed;
        await this.travelOfferRepository.save(existingRoute.offer);
      }

      await this.travelRouteRepository.save(existingRoute);
      previousRoute = existingRoute;
    }
  }

  async calculateAvailableLoad(travelRoutes: TravelRoute[], vehicleMaxCapacity: number) {
    let remainingCapacity = vehicleMaxCapacity;
    const capacities: number[] = [];

    for (const route of travelRoutes) {
      remainingCapacity -= Number(route.loadingWeight);
      remainingCapacity += Number(route.unloadingWeight);
      capacities.push(remainingCapacity);
    }

    return capacities;
  }

  async processTravelRoutes(travelRoutes: TravelRoute[], vehicleMaxCapacity: number) {
    if (travelRoutes.length < 2) {
      throw new BadRequestException('Informe no mínimo duas rotas para montar o trajeto');
    }

    let currentLoad = 0;

    for (let i = 0; i < travelRoutes.length; i++) {
      const route = travelRoutes[i];
      currentLoad += Number(route.loadingWeight);
      currentLoad -= Number(route.unloadingWeight);

      if (i === travelRoutes.length - 1 && route.loadingWeight > 0) {
        throw new BadRequestException(
          `A última parada da viagem (${route.order}) não pode deixar o veículo carregado`,
        );
      }
    }

    if (currentLoad > vehicleMaxCapacity) {
      throw new BadRequestException(
        'Carga atual excede a capacidade máxima do veículo, verifique o trajeto!',
      );
    }

    return currentLoad;
  }
}