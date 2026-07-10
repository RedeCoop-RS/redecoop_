import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Visitant } from './entities/visitant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { VisitantDto } from './Dtos/visitant.dto';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';

@Injectable()
export class VisitantService {
  constructor(
    @InjectRepository(Visitant)
    private readonly visitantRepository: Repository<Visitant>,
  ) {}

  async listAll(query: PaginateQuery) {
    const queryBuilder = this.visitantRepository
      .createQueryBuilder('visitant')
      .leftJoinAndSelect('visitant.city', 'city')
      .orderBy('visitant.createdAt', 'DESC');

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;
    const transformedData = plainToInstance(VisitantDto, data);
    return { data: transformedData, ...pagination };
  }

  async updateStatus(id: number, isActive: boolean): Promise<void> {
    const visitant = await this.visitantRepository.findOneBy({ id });

    if (!visitant) {
      throw new NotFoundException('Visitante não encontrado');
    }

    if (visitant.active === isActive) {
      throw new BadRequestException(`O visitante já está ${!isActive ? 'Inativado' : 'Ativo'}`);
    }

    visitant.active = isActive;

    await this.visitantRepository.save(visitant);
  }

  async findByUserEmail(email: string): Promise<Visitant> {
    return this.visitantRepository.findOne({
      where: { 
        user: { 
          username: email
        } 
      },
      relations: ['user', 'city.state']
    });
  }
}
