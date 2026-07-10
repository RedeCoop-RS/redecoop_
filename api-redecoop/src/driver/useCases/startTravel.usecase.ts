import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Travel, TravelStatus } from '@/travel/entities/travel.entity';
import { Repository } from 'typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { TravelService } from '@/travel/services/travel.service';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class StartTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private travelRepository: Repository<Travel>,
    private travelService: TravelService,
  ) {}

  @Transactional()
  async execute(travelId: number, user: UserLoggedDto) {
    const travel = await this.travelRepository.findOne({
      where: { id: travelId },
      relations: { offers: true },
    });

    if (!travel) {
      throw new NotFoundException('Viagem não encontrada');
    }

    if (travel.driverId !== user.sub) {
      throw new BadRequestException(
        'Você não é o motorista da viagem, não é possivel iniciar a viagem.',
      );
    }

    if (travel.status !== TravelStatus.Awaiting) {
      throw new BadRequestException(
        'Só é possível iniciar viagens que estão aguardando início.',
      );
    }

    const travelIsReadToStart = await this.travelService.isReadyToStart(travel.id);

    if (!travelIsReadToStart) {
      throw new BadRequestException(
        'A Viagem ainda tem rotas pendentes de ajustes ou ofertas pendentes.',
      );
    }

    travel.status = TravelStatus.InProgress;

    await this.travelRepository.save(travel);
  }
}
