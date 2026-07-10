import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Travel } from '../entities/travel.entity';
import { TravelRoute } from '../entities/travelRoute.entity';
import { TravelOffer } from '../../travelOffer/entities/travelOffer.entity';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class DeleteTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,

    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,

    @InjectRepository(TravelOffer)
    private readonly travelOfferRepository: Repository<TravelOffer>,
  ) {}

  async execute(id: number, user: UserLoggedDto) {
    // ⚡ Busca a viagem incluindo registros deletados (comDeleted)
    const travel = await this.travelRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!travel || travel.deletedAt) {
      throw new NotFoundException('Viagem não encontrada');
    }

    // Verifica permissão
    if (user.role !== UserRole.ADMIN && travel.cooperativeId !== user.sub) {
      throw new ForbiddenException('Sem permissão para deletar');
    }

    const now = new Date();

    // Soft delete de todas as ofertas da viagem
    const offers = await this.travelOfferRepository.find({
      where: { travel: { id } },
      withDeleted: true, // ⚡ garante que encontra ofertas que já poderiam ter sido deletadas
    });

    for (const offer of offers) {
      offer.deletedAt = now;
    }
    await this.travelOfferRepository.save(offers);

    // Soft delete de todas as rotas da viagem
    const routes = await this.travelRouteRepository.find({
      where: { travel: { id } },
      withDeleted: true, // ⚡ garante que encontra rotas mesmo deletadas
    });

    for (const route of routes) {
      route.deletedAt = now;
    }
    await this.travelRouteRepository.save(routes);

    // Soft delete da viagem
    travel.deletedAt = now;
    await this.travelRepository.save(travel);

    return { message: 'Viagem, rotas e ofertas deletadas com sucesso' };
  }
}