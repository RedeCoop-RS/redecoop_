import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Business } from '../entities/business.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { BusinessDto } from '../Dtos/business.dto';

@Injectable()
export class ReadByIdBusinessUseCase {
  constructor(
    @InjectRepository(Business)
    private readonly _businessRepository: Repository<Business>,
  ) {}

  async execute(id: number, user: UserLoggedDto): Promise<BusinessDto> {
    const business = await this._businessRepository.findOneBy({ id });

    if (!business) {
      throw new NotFoundException('Negócio não encontrado.');
    }

    if (
      user.role !== UserRole.ADMIN &&
      business.offeringCooperativeId !== user.sub &&
      business.requestingCooperativeId !== user.sub
    ) {
      throw new BadRequestException('Você não tem permissão para visualizar esse item');
    }

    return plainToInstance(BusinessDto, business);
  }
}
