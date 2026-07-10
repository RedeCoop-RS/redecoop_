import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from '../entities/driver.entity';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { DriverResponseDto } from '../Dtos/driverResponse.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class ListDriversForSelectUseCase {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  async execute(user: UserLoggedDto, cooperativeId: number) {
    const queryBuilder = this.driverRepository
      .createQueryBuilder('driver')
      .leftJoin('driver.cooperative', 'cooperative')
      .where('driver.active = :active', { active: true })
      .select(['driver.id', 'driver.name'])
      .orderBy('driver.createdAt', 'DESC');

    if (!cooperativeId) {
      throw new BadRequestException('O parâmetro cooperativeId é obrigatório');
    }

    if (user.role !== UserRole.ADMIN && user.sub !== cooperativeId) {
      throw new BadRequestException('Você não tem permissão para realizar esta ação.');
    }

    queryBuilder.andWhere('driver.cooperativeId = :cooperativeId', {
      cooperativeId,
    });

    const drivers = await queryBuilder.getMany();

    return plainToInstance(DriverResponseDto, drivers);
  }
}
