import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { TravelRouteProduct } from '@/travel/entities/travelRouteProduct.entity';
import { OfferStatus } from '@/travelOffer/entities/travelOffer.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportService } from '../report.service';
import * as moment from 'moment-timezone';
import { dateRangeSaoPaulo } from '../utils/dateRangeSaoPaulo';

@Injectable()
export class ProductsTransportedByCooperativeUseCase {
  constructor(
    @InjectRepository(TravelRouteProduct)
    private readonly _travelRouteProductRepository: Repository<TravelRouteProduct>,
    @InjectRepository(Cooperative)
    private readonly _cooperativeRepository: Repository<Cooperative>,
    private readonly reportService: ReportService,
  ) {}

  public async execute(cooperativeId: number, startDate: string, endDate: string) {
    const cooperative = await this._cooperativeRepository.findOne({ where: { id: cooperativeId } });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada.');
    }

    const { start, end } = dateRangeSaoPaulo(startDate, endDate);

    const ACTIVE_STATUSES = [OfferStatus.Confirmed, OfferStatus.ConfirmedPendingRoutes];
    const STATUS_LABEL: Partial<Record<OfferStatus, string>> = {
      [OfferStatus.Confirmed]: 'Confirmado',
      [OfferStatus.ConfirmedPendingRoutes]: 'Aguardando Rotas',
    };

    const baseRange = { start, end };

    const asParticipant = await this._travelRouteProductRepository
      .createQueryBuilder('trp')
      .innerJoinAndSelect('trp.product', 'product')
      .innerJoinAndSelect('trp.route', 'route')
      .innerJoinAndSelect('route.offer', 'offer')
      .innerJoinAndSelect('route.travel', 'travel')
      .where('offer.cooperativeId = :cooperativeId', { cooperativeId })
      .andWhere('offer.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('travel.startDateTime BETWEEN :start AND :end', baseRange)
      .andWhere('route.deletedAt IS NULL')
      .andWhere('offer.deletedAt IS NULL')
      .andWhere('travel.deletedAt IS NULL')
      .getMany();

    const asOfferer = await this._travelRouteProductRepository
      .createQueryBuilder('trp')
      .innerJoinAndSelect('trp.product', 'product')
      .innerJoinAndSelect('trp.route', 'route')
      .leftJoinAndSelect('route.offer', 'offer')
      .innerJoinAndSelect('route.travel', 'travel')
      .where('offer.id IS NULL')
      .andWhere('travel.cooperativeId = :cooperativeId', { cooperativeId })
      .andWhere('travel.startDateTime BETWEEN :start AND :end', baseRange)
      .andWhere('route.deletedAt IS NULL')
      .andWhere('travel.deletedAt IS NULL')
      .getMany();

    const byId = new Map<number, (typeof asParticipant)[0]>();
    for (const row of asParticipant) {
      byId.set(row.id, row);
    }
    for (const row of asOfferer) {
      if (!byId.has(row.id)) {
        byId.set(row.id, row);
      }
    }
    const productsInRoute = [...byId.values()];

    const content = [];

    for (let index = 0; index < productsInRoute.length; index++) {
      const productRoute = productsInRoute[index];

      if (Number(productRoute.loadedWeight) > 0) {
        const travelDate = moment
          .utc(productRoute.route.travel.startDateTime)
          .tz('America/Sao_Paulo')
          .format('DD/MM/YYYY');

        const offer = productRoute.route.offer;
        content.push({
          productName: productRoute.product.name,
          weight: productRoute.loadedWeight,
          travelDate,
          offerStatus: offer
            ? STATUS_LABEL[offer.status] ?? offer.status
            : 'Parada da viagem (ofertante)',
        });
      }
    }

    if (content.length > 0) {
      const totalWeight = productsInRoute.reduce(
        (acc, row) => acc + Number(row.loadedWeight),
        0,
      );

      content.push({
        productName: '',
        travelDate: '',
        offerStatus: '',
        weight: `Total: ${totalWeight}`,
      });
    }

    const title = `Relatório de Produtos Transportados - Cooperativa ${cooperative.fantasyName?.trim() || cooperative.companyName} - Periodo ${startDate.split('-').reverse().join('/')} - ${endDate.split('-').reverse().join('/')}`;
    const headers = [
      { name: 'Produto', key: 'productName' },
      { name: 'Peso (kg)', key: 'weight' },
      { name: 'Data da Viagem', key: 'travelDate' },
      { name: 'Status da Oferta', key: 'offerStatus' },
    ];

    return await this.reportService.generateExcell(title, headers, content);
  }
}
