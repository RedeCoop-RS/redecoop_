import { OfferStatus, TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { Business } from '@/business/entities/business.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReportService } from '../report.service';
import * as moment from 'moment-timezone';

@Injectable()
export class TravelPriceReportUseCase {
  constructor(
    @InjectRepository(TravelOffer)
    private readonly _TravelOfferRepository: Repository<TravelOffer>,
    @InjectRepository(Business)
    private readonly _businessRepository: Repository<Business>,
    private readonly reportService: ReportService,
  ) {}

  public async execute(startDate: string, endDate: string) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const ACTIVE_STATUSES = [OfferStatus.Confirmed, OfferStatus.ConfirmedPendingRoutes, OfferStatus.Negotiating];
    const STATUS_LABEL: Partial<Record<OfferStatus, string>> = {
      [OfferStatus.Confirmed]: 'Confirmado',
      [OfferStatus.ConfirmedPendingRoutes]: 'Aguardando Rotas',
      [OfferStatus.Negotiating]: 'Em Negociação',
    };

    const travelOffers = await this._TravelOfferRepository
      .createQueryBuilder('tof')
      .innerJoinAndSelect('tof.cooperative', 'cooperative')
      .innerJoinAndSelect('tof.travel', 'travel')
      .where('tof.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('travel.startDateTime BETWEEN :start AND :end', { start: new Date(startDate), end })
      .andWhere('tof.deletedAt IS NULL')
      .andWhere('travel.deletedAt IS NULL')
      .getMany();

    const offerIds = travelOffers.map((o) => o.id);
    const businesses =
      offerIds.length > 0
        ? await this._businessRepository.find({ where: { travelOfferId: In(offerIds) } })
        : [];

    const businessByOfferId = new Map(businesses.map((b) => [b.travelOfferId, b]));

    let content = [];

    for (let index = 0; index < travelOffers.length; index++) {
      const travelOffer = travelOffers[index];
      const business = businessByOfferId.get(travelOffer.id);

      const localTime = moment
        .utc(travelOffer.travel.startDateTime)
        .tz('America/Sao_Paulo')
        .format('DD/MM/YYYY HH:mm');

      content.push({
        cooperativeName:
          travelOffer.cooperative.fantasyName?.trim() || travelOffer.cooperative.companyName,
        travelStartTime: localTime,
        price: business?.fee ?? '',
        offerStatus: STATUS_LABEL[travelOffer.status] ?? travelOffer.status,
      });
    }

    const title = `Relatório de Preços de Viagens - Periodo ${startDate.split('-').reverse().join('/')} - ${endDate.split('-').reverse().join('/')}`;
    const headers = [
      { name: 'Nome da Cooperativa', key: 'cooperativeName' },
      { name: 'Data/hora Viagem', key: 'travelStartTime' },
      { name: 'Preço', key: 'price' },
      { name: 'Status da Oferta', key: 'offerStatus' },
    ];

    return await this.reportService.generateExcell(title, headers, content);
  }
}
