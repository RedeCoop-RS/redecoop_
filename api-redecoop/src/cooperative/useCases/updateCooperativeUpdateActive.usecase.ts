import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class UpdateCooperativeActiveStatusUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
  ) {}

  async execute(id: number, active: boolean) {
    const cooperative = await this.cooperativeRepository.findOneBy({ id });

    if (cooperative.active === active) {
      throw new BadRequestException(`A Cooperativa já foi ${active ? 'ativada' : 'inativada'}`);
    }

    cooperative.active = active;
    await this.cooperativeRepository.save(cooperative);
  }
}
