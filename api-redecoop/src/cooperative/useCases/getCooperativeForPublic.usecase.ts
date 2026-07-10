import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Not, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CooperativeDto } from '../Dtos/cooperativeResponse.dto';
import { UserRole } from '@/User/entities/user.entity';
import { CooperativeService } from '../cooperative.service';

@Injectable()
export class GetCooperativeForPublicUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    private readonly cooperativeService: CooperativeService,
  ) {}

  async execute(id: number) {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id, user: { role: Not(UserRole.ADMIN) }, active: true },
      relations: ['deliveryCities.city', 'city'],
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada');
    }

    const totalProductsPerCategory = await this.cooperativeService.calculateTotalProductsPerCategory(
      cooperative.id,
    );

    return {
      id: cooperative.id,
      companyName: cooperative.companyName,
      fantasyName: cooperative.fantasyName ?? '',
      img: cooperative.img,
      description: cooperative.description,
      cooperativeDeliveryCities:
        cooperative.deliveryCities
          ?.filter(dc => dc.city)
          .map(dc => ({
            id: dc.city.id,
            name: dc.city.name,
          })) ?? [],
      city: cooperative.city?.name ?? '',
      cnpj: cooperative.cnpj,
      totalProductsPerCategory
    };
  }
}
