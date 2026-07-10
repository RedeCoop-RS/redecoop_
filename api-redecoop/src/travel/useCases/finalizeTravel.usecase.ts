import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Travel, TravelStatus } from '../entities/travel.entity';
import { FinalizeTravelDto } from '../Dtos/finalizeTravel.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class FinalizeTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  async execute(id: number, data: FinalizeTravelDto, user: UserLoggedDto) {
    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('Apenas administradores podem finalizar viagens.');
    }

    const travel = await this.travelRepository.findOne({ where: { id } });

    if (!travel) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    if (travel.status === TravelStatus.Completed) {
      throw new BadRequestException('Esta viagem já foi finalizada.');
    }

    travel.status = TravelStatus.Completed;
    travel.completedAt = new Date(data.completedAt);

    await this.travelRepository.save(travel);

    return { id: travel.id, status: travel.status, completedAt: travel.completedAt };
  }
}
