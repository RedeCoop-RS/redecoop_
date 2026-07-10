import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { UserRole } from '@/User/entities/user.entity';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { plainToInstance } from 'class-transformer';
import { CooperativeDto } from '../Dtos/cooperativeResponse.dto';

@Injectable()
export class GetCooperativesUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
  ) {}

  async execute(query: PaginateQuery) {
    const queryBuilder = this.cooperativeRepository
      .createQueryBuilder('cooperative')
      .leftJoinAndSelect('cooperative.city', 'city')
      .leftJoin('cooperative.debits', 'debit')
      .leftJoin('cooperative.user', 'user')
      .where('user.role != :role', { role: UserRole.ADMIN })
      .addSelect('COALESCE(SUM(debit.amount), 0)', 'totalDebits')
      .orderBy('cooperative.createdAt', 'DESC')
      .groupBy('cooperative.id');

    const paginated = await paginate(query, queryBuilder);

    const debitsByCooperative = await this.cooperativeRepository
      .createQueryBuilder('cooperative')
      .leftJoin('cooperative.debits', 'debit')
      .select('cooperative.id', 'cooperativeId')
      .addSelect('COALESCE(SUM(debit.amount), 0)', 'totalDebits')
      .groupBy('cooperative.id')
      .getRawMany();

    const debits = await this.cooperativeRepository
      .createQueryBuilder('cooperative')
      .leftJoin('cooperative.debits', 'debit')
      .select('COALESCE(SUM(debit.amount), 0)', 'totalDebits')
      .getRawOne();

    const { data, ...pagination } = paginated;
    const transformedData = plainToInstance(CooperativeDto, data);

    const cooperativesWithDebits = transformedData.map((cooperative) => {
      const debits = debitsByCooperative.find((d) => d.cooperativeId === cooperative.id);
      return {
        ...cooperative,
        totalDebits: debits ? Number(debits.totalDebits) : 0,
      };
    });

    return { data: cooperativesWithDebits, ...pagination, totalDebits: Number(debits.totalDebits) };
  }
}
