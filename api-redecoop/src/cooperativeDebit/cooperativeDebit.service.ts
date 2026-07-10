import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CooperativeDebit } from './entities/cooperativeDebit.entity';
import { Repository } from 'typeorm';
import { Business } from '@/business/entities/business.entity';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class CooperativeDebitService {
  constructor(
    @InjectRepository(CooperativeDebit)
    private readonly cooperativeDebitRepository: Repository<CooperativeDebit>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  @Transactional()
  async addDebit(data: { cooperativeId: number; businessId: number }) {
    const { businessId, cooperativeId } = data;

    const business = await this.businessRepository.findOneBy({ id: businessId });

    const debit = await this.cooperativeDebitRepository.save(
      this.cooperativeDebitRepository.create({
        cooperative: { id: cooperativeId },
        amount: business.fee,
        description: `Débito referente a oferta de viagem #${business.travelOfferId}`,
      }),
    );

    business.debitId = debit.id;

    await this.businessRepository.save(business);
  }
}
