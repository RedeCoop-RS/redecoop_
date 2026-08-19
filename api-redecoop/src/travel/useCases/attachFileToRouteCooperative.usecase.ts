import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { TravelRoute } from '@/travel/entities/travelRoute.entity';
import { UserRole } from '@/User/entities/user.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class AttachFileToRouteCooperativeUseCase {
  constructor(
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
  ) {}

  @Transactional()
  async execute(travelRouteId: number, user: UserLoggedDto, file: Express.Multer.File) {
    const travelRoute = await this.travelRouteRepository.findOne({
      where: { id: travelRouteId },
      relations: { offer: true, travel: true },
    });

    if (!travelRoute) {
      throw new NotFoundException('Rota encontrada no trajeto');
    }

    if (!file?.filename) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    const offerCooperativeId = travelRoute.offer?.cooperativeId;
    const travelCooperativeId = travelRoute.travel?.cooperativeId;

    if (
      offerCooperativeId !== user.sub &&
      travelCooperativeId !== user.sub &&
      user.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException(
        'Você não pode anexar arquivos nessa rota, não foi possivel anexar o arquivo.',
      );
    }

    travelRoute.coopAttachment = file?.filename;

    await this.travelRouteRepository.save(travelRoute);

    return { file: file?.filename };
  }
}
