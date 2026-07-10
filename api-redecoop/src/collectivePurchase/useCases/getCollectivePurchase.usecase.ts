import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectivePurchase } from '../entities/collectivePurchase.entity';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CollectivePruchaseDto } from '../Dtos/collectivePurchase.dto';

@Injectable()
export class GetCollectivePurchaseUseCase {
  constructor(
    @InjectRepository(CollectivePurchase)
    private readonly collectivePurchaseRepository: Repository<CollectivePurchase>,
  ) {}

  async execute(id: number) {
    const collectivePurchase = await this.collectivePurchaseRepository.findOne({
      where: { id },
      relations: { city: { state: true } },
    });

    if (!collectivePurchase) {
      throw new NotFoundException(`Compra coletiva com o ID ${id} não encontrada.`);
    }
    

    return plainToInstance(CollectivePruchaseDto, collectivePurchase);
  }
}
