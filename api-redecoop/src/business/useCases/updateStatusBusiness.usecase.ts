import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Business, BusinessStatus } from '../entities/business.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class UpdateStatusBusinessUseCase {
  @InjectRepository(Business)
  private readonly businessRepository: Repository<Business>;

  async execute(id: number, status: BusinessStatus, user?: UserLoggedDto) {
    const business = await this.businessRepository.findOneBy({ id });

    if (!business) {
      throw new NotFoundException('Negócio não encontrado');
    }

    if (user.role !== UserRole.ADMIN && business.offeringCooperativeId !== user.sub) {
      throw new BadRequestException('O Negócio só pode ser finalizado por quem ofertou.');
    }

    if (business.status === status) {
      throw new BadRequestException('Negócio já esta no status solicitado');
    }

    business.status = status;

    await this.businessRepository.save(business);
  }
}
