import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class AttachFileToRouteUseCase {
  constructor(
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
  ) {}

  @Transactional()
  async execute(travelRouteId: number, user: UserLoggedDto, file: Express.Multer.File) {
    const travelRoute = await this.travelRouteRepository.findOne({
      where: { id: travelRouteId },
      relations: { travel: { travelRoutes: true } },
    });

    if (!travelRoute) {
      throw new NotFoundException('Rota encontrada no trajeto');
    }

    if (travelRoute.travel.driverId !== user.sub) {
      throw new BadRequestException(
        'Você não é o motorista da viagem, não foi possivel anexar o arquivo.',
      );
    }

    travelRoute.attachment = file?.filename;

    await this.travelRouteRepository.save(travelRoute);
  }
}
