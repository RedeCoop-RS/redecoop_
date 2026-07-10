import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Not, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CooperativeDto } from '../Dtos/cooperativeResponse.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class ListCooperativesForPublicUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
  ) {}

  async execute(): Promise<CooperativeDto[]> {
    const cooperatives = await this.cooperativeRepository.find({
      select: ['id', 'companyName', 'fantasyName', 'type', 'city'],
      relations: ['city', 'city.state'],
      where: { user: { role: Not(UserRole.ADMIN) }, active: true },
    });

    return plainToInstance(CooperativeDto, cooperatives);
  }
}
