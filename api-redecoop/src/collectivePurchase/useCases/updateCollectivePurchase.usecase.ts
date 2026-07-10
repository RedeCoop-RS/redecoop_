import { Injectable, NotFoundException } from '@nestjs/common';
import { CollectivePurchase } from '../entities/collectivePurchase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateCollectivePurchaseDto } from '../Dtos/updateCollectivePurchase.dto';

@Injectable()
export class UpdateCollectivePurchaseUseCase {
  constructor(
    @InjectRepository(CollectivePurchase)
    private readonly collectivePurchaseRepository: Repository<CollectivePurchase>,
  ) {}

  async execute(id: number, data: UpdateCollectivePurchaseDto): Promise<void> {
    const collectivePurchase = await this.collectivePurchaseRepository.findOneBy({ id });

    if (!collectivePurchase) {
      throw new NotFoundException(`Compra coletiva com o ID ${id} não encontrada.`);
    }

    const { products, ...dataUpdate } = data;
    const productsJson = JSON.stringify(products);

    Object.assign(collectivePurchase, dataUpdate);
    collectivePurchase.products = productsJson;

    await this.collectivePurchaseRepository.save(collectivePurchase);
  }
}
