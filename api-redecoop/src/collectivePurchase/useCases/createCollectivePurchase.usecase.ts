import { Injectable } from '@nestjs/common';
import { CollectivePurchase } from '../entities/collectivePurchase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCollectivePurchaseDto } from '../Dtos/createCollectivePurchase.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';

@Injectable()
export class CreateCollectivePurchaseUseCase {
  constructor(
    @InjectRepository(CollectivePurchase)
    private readonly collectivePurchaseRepository: Repository<CollectivePurchase>,
  ) {}

  async execute(data: CreateCollectivePurchaseDto, user: UserLoggedDto): Promise<void> {
    const { cityId, description, products } = data;

    const productsJson = JSON.stringify(products);
    await this.collectivePurchaseRepository.save(
      this.collectivePurchaseRepository.create({
        cooperative: { id: user.sub },
        description,
        city: { id: cityId },
        products: productsJson,
        active: true,
      }),
    );
  }
}
