import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectivePurchase } from '../entities/collectivePurchase.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { BusinessService } from '@/business/services/business.service';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class StartTradingCollectivePurchaseUseCase {
  constructor(
    @InjectRepository(CollectivePurchase)
    private readonly collectivePurchaseRepository: Repository<CollectivePurchase>,
    private readonly businessService: BusinessService,
  ) {}

  @Transactional()
  async execute(collectivePurchaseId: number, initialMessage: string, user: UserLoggedDto) {
    const collectivePurchase = await this.collectivePurchaseRepository.findOne({
      where: { id: collectivePurchaseId },
      relations: { business: true },
    });

    if (!collectivePurchase) {
      throw new NotFoundException('Compra coletiva não encontrada.');
    }

    if (!collectivePurchase.active) {
      throw new BadRequestException('Compra coletiva não esta mais disponivel.');
    }

    if (collectivePurchase.cooperativeId === user.sub) {
      throw new BadRequestException('Você não pode iniciar uma conversa com você mesmo');
    }

    const existsBusiness = collectivePurchase.business.some(
      (business) => business.requestingCooperativeId === user.sub,
    );

    if (existsBusiness) {
      throw new BadRequestException(
        'Você já tem uma negociação em aberto para essa compra coletiva.',
      );
    }

    await this.businessService.createBusiness({
      requestingCooperativeId: user.sub,
      offeringCooperativeId: collectivePurchase.cooperativeId,
      initialMessage,
      collectivePurchase: collectivePurchase,
    });
  }
}
