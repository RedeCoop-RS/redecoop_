import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ChangeLog, OfferStatus, TravelOffer } from './entities/travelOffer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductsOfferTravelDto, StopOfferDto } from './Dtos/createOfferTravel.dto';
import { Transactional } from 'typeorm-transactional';
import { TravelRouteService } from '../travel/services/travelRoute.service';
import { ConfigSystemService } from '@/configSystem/configSystem.service';
import { VehicleTypeService } from '@/vehicleType/vehicleType.service';
import { ProductTypeService } from '@/productType/productType.service';
import { TravelOfferDto } from './Dtos/travelOffer.dto';
import { plainToInstance } from 'class-transformer';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { NotificationService } from '@/notification/notification.service';
import { NotificationMessages } from '@/notification/notification-messages';
import { NotificationType } from '@/notification/entities/notification.entity';
import { Business, BusinessStatus } from '@/business/entities/business.entity';
import { Catalog } from '@/catalog/entities/catalog.entity';
import { Product } from '@/product/entities/product.entity';
import { Vehicle } from '@/vehicle/entities/vehicle.entity';
import { ValueRangeService } from '@/valueRange/valueRange.service';

@Injectable()
export class TravelOfferService {
  constructor(
    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Catalog)
    private readonly catalogRepository: Repository<Catalog>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly travelRouteService: TravelRouteService,
    private readonly configSystemService: ConfigSystemService,
    private readonly vehicleTypeService: VehicleTypeService,
    private readonly productTypeService: ProductTypeService,
    private readonly notificationService: NotificationService,
    private readonly valueRangeService: ValueRangeService,
  ) {}

  async offerExists(travelId: number, cooperativeId: number): Promise<boolean> {
    return await this.travelOfferRepository.existsBy({
      cooperative: { id: cooperativeId },
      travel: { id: travelId },
      status: OfferStatus.Awaiting,
    });
  }

  public async validateStops(
    stops: StopOfferDto[],
    vehicleMaxCapacity: number,
    cooperativeId: number,
  ) {
    let currentLoad = 0;

    const productWeightBalance: { [productId: number]: number } = {};

    if (stops.length < 2) {
      throw new BadRequestException(
        'Você deve informar no minimo duas rotas para montar seu trajeto',
      );
    }

    for (let i = 0; i < stops.length; i++) {
      const route = stops[i];

      const loadingWeight = route.productsLoad.reduce((sum, product) => sum + product.weight, 0);
      const unloadingWeight = route.productsUnload.reduce(
        (sum, product) => sum + product.weight,
        0,
      );

      currentLoad += Number(loadingWeight);
      currentLoad -= Number(unloadingWeight);

      if (i === stops.length - 1) {
        if (loadingWeight > 0) {
          throw new BadRequestException(
            `Sua parada no endereço ${route.address} é a última da viagem; você não pode deixar o caminhão carregado.`,
          );
        }
      }

      if (currentLoad > vehicleMaxCapacity) {
        throw new BadRequestException(
          `A carga atual excede a capacidade máxima do veículo, verifique o trajeto!`,
        );
      }

      for (const productLoad of route.productsLoad) {
        const productInCatalog = await this.catalogRepository.existsBy({
          productId: productLoad.productId,
          cooperativeId,
        });
        if (!productInCatalog) {
          throw new BadRequestException(
            `Produto ${productLoad.productId} carregado no endereço ${route.address} não encontrado ou não está mais disponível no catálogo da cooperativa`,
          );
        }

        if (!productWeightBalance[productLoad.productId]) {
          productWeightBalance[productLoad.productId] = 0;
        }
        productWeightBalance[productLoad.productId] += productLoad.weight ?? 0;
      }

      for (const productUnload of route.productsUnload) {
        if (!productWeightBalance[productUnload.productId]) {
          throw new BadRequestException(
            `Produto descarregado no endereço ${route.address} não foi previamente carregado no caminhão`,
          );
        }
        productWeightBalance[productUnload.productId] -= productUnload.weight ?? 0;

        if (productWeightBalance[productUnload.productId] < 0) {
          throw new BadRequestException(
            `Tentativa de descarregar mais peso do que o carregado para o produto ${productUnload.productId} no endereço ${route.address}`,
          );
        }
      }
    }
  }

  async view(id: number, user: UserLoggedDto): Promise<TravelOfferDto> {
    const queryBuilder = this.travelOfferRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.travel', 'travel')
      .leftJoinAndSelect('travel.travelRoutes', 'tr')
      .leftJoinAndSelect('tr.offer', 'trOffer')
      .leftJoinAndSelect('offer.routes', 'offerRoutes')
      .leftJoinAndSelect('offer.business', 'business')
      .leftJoinAndSelect('travel.vehicle', 'vehicle')
      .leftJoinAndSelect('travel.driver', 'driver')
      .leftJoinAndSelect('travel.cooperative', 'travelCooperative')
      .leftJoinAndSelect('offer.cooperative', 'offerCooperative')
      .leftJoinAndSelect('vehicle.type', 'vehicleType')
      .leftJoinAndSelect('business.conversation', 'conversation')
      .leftJoinAndSelect('offerRoutes.routeProduct', 'routeProduct')
      .leftJoinAndSelect('routeProduct.product', 'product')
      .where('(tr.offer IS NULL OR offer.status = :offerStatus)', {
        offerStatus: OfferStatus.Confirmed,
      })
      .andWhere('offer.id = :offerId', { offerId: id })
      .select([
        'offer.id',
        'offer.status',
        'offer.cooperativeId',
        'offer.changelogs',
        'offerRoutes.id',
        'offerRoutes.order',
        'offerRoutes.address',
        'offerRoutes.distance',
        'offerRoutes.loadingWeight',
        'offerRoutes.unloadingWeight',
        'offerRoutes.latitude',
        'offerRoutes.longitude',
        'travel.id',
        'travel.startDateTime',
        'travel.status',
        'travel.vehicleId',
        'travel.driverId',
        'tr.id',
        'tr.order',
        'tr.distance',
        'tr.address',
        'tr.loadingWeight',
        'tr.unloadingWeight',
        'vehicle.id',
        'vehicleType.name',
        'vehicle.maximumWeight',
        'driver.name',
        'business.id',
        'business.fee',
        'business.status',
        'conversation.id',
        'travelCooperative.id',
        'travelCooperative.companyName',
        'travelCooperative.fantasyName',
        'travelCooperative.email',
        'travelCooperative.phone',
        'offerCooperative.id',
        'routeProduct.id',
        'routeProduct.loadedWeight',
        'routeProduct.unloadedWeight',
        'product.id',
      ]);

    const offer = await queryBuilder.getOne();

    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    offer.routes.sort((a, b) => a.order - b.order);
    offer.travel.travelRoutes.sort((a, b) => a.order - b.order);

    if (
      user.role !== UserRole.ADMIN &&
      offer.cooperative.id !== user.sub &&
      offer.travel.cooperative.id !== user.sub
    ) {
      throw new BadRequestException('Você não pode ver uma oferta no qual não é participante');
    }

    const remainingCapacities = await this.travelRouteService.calculateAvailableLoad(
      offer.travel.travelRoutes,
      offer.travel.vehicle.maximumWeight,
    );

    offer.travel.travelRoutes = offer.travel.travelRoutes.map((route, routeIndex) => ({
      ...route,
      remainingCapacity: remainingCapacities[routeIndex],
    }));

    return plainToInstance(TravelOfferDto, offer);
  }

  @Transactional()
  async approveOrRejectProposal(travelOfferId: number, approved: boolean, user: UserLoggedDto) {
    const offer = await this.travelOfferRepository.findOne({
      where: { id: travelOfferId },
      relations: ['travel', 'business', 'travel.cooperative'],
    });

    if (!offer) {
      throw new NotFoundException('A Oferta não foi encontrada.');
    }

    if (offer.travel.cooperativeId !== user.sub) {
      throw new BadRequestException(
        'Apenas a cooperativa ofertante da viagem pode aceitar/rejeitar a proposta',
      );
    }

    const business = offer.business;
    let changelog: ChangeLog | undefined;
    if (approved) {
      if (offer.status === OfferStatus.ConfirmedPendingRoutes) {
        throw new BadRequestException('A Oferta já foi aceita.');
      }
      offer.status = OfferStatus.ConfirmedPendingRoutes;
      business.status = BusinessStatus.Confirmed;

      changelog = {
        title: 'A Proposta foi <span class="text-green"><b>aceita!</b></span>',
        createdAt: new Date(),
        content: `
        <p class="fs-12">Seguem as informações de contato da Cooperativa com a qual você está negociando:</p>
        <span class="fs-12"><b>${offer.travel.cooperative.companyName}</b></span>
        <br/>
        <span class="fs-12"><b>Email: ${offer.travel.cooperative.email}</b></span>
        <br/>
        <span class="fs-12"><b>Telefone: ${offer.travel.cooperative.phone}</b></span>
        <br/>
        <span class="fs-12">Este chat estará aberto até que a Viagem esteja concluida.</span>
        
        `,
      };

      await this.notificationService.sendNotification(
        NotificationType.TRAVEL_OFFER,
        NotificationMessages.PROPOSAL_TRAVEL_ACCEPTED(offer.travel.startDateTime),
        offer.cooperativeId,
      );
    } else {
      if (offer.status === OfferStatus.Rejected) {
        throw new BadRequestException('A Oferta já foi rejeitada.');
      }

      offer.status = OfferStatus.Rejected;
      business.status = BusinessStatus.Canceled;

      changelog = {
        title: 'A Proposta foi <span class="text-red"><b>rejeitada!</b></span>',
        createdAt: new Date(),
      };

      await this.notificationService.sendNotification(
        NotificationType.TRAVEL_OFFER,
        NotificationMessages.PROPOSAL_TRAVEL_REJECTED(offer.travel.startDateTime),
        offer.cooperativeId,
      );
    }
    if (changelog) {
      offer.changelogs = Array.isArray(offer.changelogs) ? offer.changelogs : [];
      offer.changelogs.push(changelog);
    }

    await this.businessRepository.save(business);
    await this.travelOfferRepository.save(offer);
  }

  async calculateTravelFee(
    totalDistance: number,
    productsLoad: ProductsOfferTravelDto[],
    vehicleId: number,
  ): Promise<number> {
    const vehicle = await this.vehicleRepository.findOneBy({ id: vehicleId });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    const minimumFreight = await this.configSystemService.getMinimumServiceTax();
    const taxService = await this.configSystemService.getTaxService();
    const vehicleTypeMpy = await this.vehicleTypeService.getMpyForVehicleType(vehicle.typeId);

    const totalWeight = productsLoad.reduce((sum, product) => sum + Number(product.weight), 0);

    const pricePerDistanceAndWeight = await this.valueRangeService.getpricePerDistanceAndWeight(
      totalDistance,
      totalWeight,
    );

    const valueBase = totalWeight * pricePerDistanceAndWeight;

    let valueWithMpy = valueBase * vehicleTypeMpy;

    if (valueWithMpy < minimumFreight) {
      valueWithMpy = minimumFreight;
    }

    const commission = valueWithMpy * (taxService / 100);
    const cost = valueWithMpy + commission;

    return cost;
  }
}
