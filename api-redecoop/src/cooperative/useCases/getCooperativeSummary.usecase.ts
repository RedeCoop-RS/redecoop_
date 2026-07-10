import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CooperativeDto } from '../Dtos/cooperativeResponse.dto';

@Injectable()
export class GetCooperativeSummaryUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
  ) {}

  async execute(id: number) {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id },
      relations: ['city', 'city.state'],
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada');
    }

    return plainToInstance(CooperativeDto, cooperative);
  }
}
