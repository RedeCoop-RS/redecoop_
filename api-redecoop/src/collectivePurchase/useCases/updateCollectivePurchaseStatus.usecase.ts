import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectivePurchase } from '../entities/collectivePurchase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UpdateCollectivePurchaseStatusUseCase {
  constructor(
    @InjectRepository(CollectivePurchase)
    private readonly collectivePurchaseRepository: Repository<CollectivePurchase>,
  ) {}

  async execute(id: number, active: boolean) {
    const cp = await this.collectivePurchaseRepository.findOneBy({ id });

    if (!cp) {
      throw new NotFoundException('Oportunidade não encontrada!');
    }

    if (cp.active === active) {
      throw new BadRequestException(
        `A Oportunidade já consta ${active ? 'ativada' : 'inativada'}.`,
      );
    }

    cp.active = active;

    await this.collectivePurchaseRepository.save(cp);
  }
}
