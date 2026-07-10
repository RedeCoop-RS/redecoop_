import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from '../entities/driver.entity';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { plainToInstance } from 'class-transformer';
import { DriverResponseDto } from '../Dtos/driverResponse.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class ListDriversUseCase {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  async execute(user: UserLoggedDto, query?: PaginateQuery) {
    const queryBuilder = this.driverRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.cooperative', 'cooperative')
      .orderBy('driver.createdAt', 'DESC');

    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere('cooperative.id = :cooperativeId', {
        cooperativeId: user.sub,
      });
    }

    const { filter } = query;

    if (filter && filter.cooperativeId && user.role === UserRole.ADMIN) {
      queryBuilder.andWhere('cooperative.id = :cooperativeId', {
        cooperativeId: filter.cooperativeId,
      });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformedData = plainToInstance(DriverResponseDto, paginated.data);

    return { data: transformedData, ...pagination } as Paginated<DriverResponseDto>;
  }
}
