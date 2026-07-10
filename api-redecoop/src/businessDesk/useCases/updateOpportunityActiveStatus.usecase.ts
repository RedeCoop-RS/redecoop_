import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessDesk } from '../entities/businessDesk.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UpdateOpportunityActiveStatusUseCase {
  constructor(
    @InjectRepository(BusinessDesk)
    private readonly businessDeskRepository: Repository<BusinessDesk>,
  ) {}
  async execute(id: number, active: boolean) {
    const opportunity = await this.businessDeskRepository.findOneBy({ id });

    if (!opportunity) {
      throw new NotFoundException('Oportunidade não encontrada');
    }

    if (opportunity.deletedAt) {
      throw new BadRequestException('Esta oportunidade foi removida e não pode ser alterada.');
    }

    if (opportunity.active === active) {
      throw new BadRequestException(`A Oportunidade já foi ${active ? 'ativado' : 'inativado'}`);
    }

    opportunity.active = active;
    await this.businessDeskRepository.save(opportunity);
  }
}
