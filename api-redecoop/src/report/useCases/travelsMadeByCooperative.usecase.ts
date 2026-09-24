import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { Travel, TravelStatus } from '@/travel/entities/travel.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ReportService } from '../report.service';
import { OfferStatus, TravelOffer } from '@/travelOffer/entities/travelOffer.entity';
import { dateRangeSaoPaulo } from '../utils/dateRangeSaoPaulo';

@Injectable()
export class TravelsMadeByCooperativeUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly _cooperativeRepository: Repository<Cooperative>,
    @InjectRepository(Travel)
    private readonly _travelRepository: Repository<Travel>,
    @InjectRepository(TravelOffer)
    private readonly _travelOfferRepository: Repository<TravelOffer>,
    private readonly reportService: ReportService,
  ) {}

  public async execute(startDate: string, endDate: string) {
    const cooperatives = await this._cooperativeRepository.find();
    const { start, end } = dateRangeSaoPaulo(startDate, endDate);

    let content = [];

    for (let index = 0; index < cooperatives.length; index++) {
      const cooperative = cooperatives[index];
      const offererTotal = await this._travelRepository.count({
        where: {
          status: TravelStatus.Completed,
          cooperativeId: cooperative.id,
          startDateTime: Between(start, end),
        },
      });
      const participantTotal = await this._travelOfferRepository
        .createQueryBuilder('tof')
        .innerJoin('tof.travel', 'travel')
        .where('tof.status IN (:...statuses)', {
          statuses: [OfferStatus.Confirmed, OfferStatus.ConfirmedPendingRoutes],
        })
        .andWhere('tof.cooperativeId = :cooperativeId', { cooperativeId: cooperative.id })
        .andWhere('travel.startDateTime BETWEEN :start AND :end', { start, end })
        .andWhere('tof.deletedAt IS NULL')
        .andWhere('travel.deletedAt IS NULL')
        .getCount();

      const participantPending = await this._travelOfferRepository
        .createQueryBuilder('tof')
        .innerJoin('tof.travel', 'travel')
        .where('tof.status = :status', { status: OfferStatus.ConfirmedPendingRoutes })
        .andWhere('tof.cooperativeId = :cooperativeId', { cooperativeId: cooperative.id })
        .andWhere('travel.startDateTime BETWEEN :start AND :end', { start, end })
        .andWhere('tof.deletedAt IS NULL')
        .andWhere('travel.deletedAt IS NULL')
        .getCount();

      if (offererTotal > 0 || participantTotal > 0) {
        content.push({
          cooperativeName: cooperative.fantasyName?.trim() || cooperative.companyName,
          offerer: offererTotal,
          participant: participantTotal,
          pendingRoutes: participantPending > 0 ? 'Sim' : 'Não',
          total: offererTotal + participantTotal,
        });
      }
    }

    const title = 'Relatório de Viagens Realizadas Por Cooperativa';
    const headers = [
      { name: 'Nome da Cooperativa', key: 'cooperativeName' },
      { name: 'Ofertante', key: 'offerer' },
      { name: 'Participante', key: 'participant' },
      { name: 'Rotas Pendentes', key: 'pendingRoutes' },
      { name: 'Total de Viagens', key: 'total' },
    ];

    return await this.reportService.generateExcell(title, headers, content);
  }
}
