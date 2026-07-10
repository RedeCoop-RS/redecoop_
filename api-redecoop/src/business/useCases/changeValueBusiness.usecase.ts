import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Business, BusinessStatus, BusinessType } from '../entities/business.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Transactional } from 'typeorm-transactional';
import { TravelOffer } from '@/travelOffer/entities/travelOffer.entity';

@Injectable()
export class ChangeValueBusinessUseCase {
  constructor(
    @InjectRepository(Business)
    private readonly _businessRepository: Repository<Business>,
    @InjectRepository(TravelOffer)
    private readonly _travelOfferRepository: Repository<TravelOffer>,
  ) {}

  @Transactional()
  async execute(id: number, value: number): Promise<void> {
    const business = await this._businessRepository.findOneBy({ id });

    if (!business) {
      throw new NotFoundException('Negócio não encontrado.');
    }

    if (business.type !== BusinessType.V || !business.travelOfferId) {
      throw new BadRequestException(
        'Impossivel alterar o valor de um negócio que não é uma viagem.',
      );
    }

    if (business.status === BusinessStatus.Done) {
      throw new BadRequestException(
        'Impossivel alterar o valor de um negócio que já foi finalizado.',
      );
    }

    const travelOffer = await this._travelOfferRepository.findOneBy({ id: business.travelOfferId });

    travelOffer.changelogs = Array.isArray(travelOffer.changelogs) ? travelOffer.changelogs : [];
    travelOffer.changelogs.push({
      title: `A Proposta teve o valor alterado de <span class="text-danger">R$${business.fee}</span> para <span class="text-green">R$${value}</span>`,
      createdAt: new Date(),
    });

    business.fee = value;

    await Promise.all([
      this._travelOfferRepository.save(travelOffer),
      this._businessRepository.save(business),
    ]);
  }
}
