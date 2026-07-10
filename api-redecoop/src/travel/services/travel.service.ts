import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, Between } from 'typeorm';
import { Travel, TravelStatus } from '../entities/travel.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OfferStatus } from '../../travelOffer/entities/travelOffer.entity';

export interface AvailableTravelsResponse {
  data: Travel[];
  meta: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
  };
}

@Injectable()
export class TravelService {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  /** Pode iniciar: sem ofertas pendentes (confirmadas ou rejeitadas ou sem ofertas). Sem restrição de data. */
  async isReadyToStart(travelId: number): Promise<boolean> {
    const travel = await this.travelRepository.findOne({
      where: { id: travelId, deletedAt: null },
      relations: { offers: true },
    });
    if (!travel) throw new NotFoundException('Viagem não encontrada');

    const hasPendingOffers = travel.offers.some(
      (offer) =>
        offer.status !== OfferStatus.Confirmed &&
        offer.status !== OfferStatus.Rejected,
    );

    return travel.offers.length === 0 || !hasPendingOffers;
  }

  // 🔹 Conta viagens concluídas por veículo
  async countTravelsByVehicle(vehicleId: number): Promise<number> {
    return this.travelRepository.count({
      where: { vehicleId, status: TravelStatus.Completed, deletedAt: null },
    });
  }

  // 🔹 Retorna todas as viagens ativas
  async getActiveTravels(): Promise<Travel[]> {
    return this.travelRepository.find({ where: { deletedAt: null } });
  }

  // 🔹 Retorna uma viagem específica, ignorando deletadas
  async getTravelById(travelId: number): Promise<Travel> {
    const travel = await this.travelRepository.findOne({
      where: { id: travelId, deletedAt: null },
      relations: { offers: true },
    });
    if (!travel) throw new NotFoundException('Viagem não encontrada');
    return travel;
  }

  // 🔥 Soft delete usando TypeORM nativo
  async deleteTravel(travelId: number): Promise<void> {
    const result = await this.travelRepository.softDelete({ id: travelId });

    if (result.affected === 0) {
      throw new NotFoundException('Viagem não encontrada ou já deletada');
    }
  }

  // 🔹 Retorna viagens disponíveis com paginação e filtros
  async availableTravels(
    page = 1,
    itemsPerPage = 20,
    dateRange?: string,
    vehicleTypeId?: string,
  ): Promise<AvailableTravelsResponse> {
    const skip = (page - 1) * itemsPerPage;

    const where: any = { deletedAt: null }; // filtra soft deletes

    if (dateRange) {
      const [start, end] = dateRange.split(',');
      where.startDateTime = Between(new Date(start), new Date(end));
    }

    if (vehicleTypeId) {
      where.vehicleTypeId = vehicleTypeId;
    }

    const [travels, totalItems] = await this.travelRepository.findAndCount({
      where,
      order: { startDateTime: 'ASC' },
      skip,
      take: itemsPerPage,
    });

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return {
      data: travels,
      meta: {
        totalItems,
        currentPage: page,
        totalPages,
        itemsPerPage,
      },
    };
  }
}