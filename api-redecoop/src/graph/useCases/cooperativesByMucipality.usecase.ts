import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphDto } from '../Dtos/graph.dto';

@Injectable()
export class CooperativesByMunicipalityGraphUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly _CooperativeRepository: Repository<Cooperative>,
  ) {}

  async execute(): Promise<GraphDto> {
    const cooperatives = await this._CooperativeRepository.find({
      relations: { city: true },
    });

    const result = cooperatives.reduce(
      (acc, cooperative) => {
        if (cooperative.city) {
          const cityName = cooperative.city.name;
          if (!acc[cityName]) {
            acc[cityName] = 0;
          }
          acc[cityName]++;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      categories: Object.keys(result),
      data: Object.values(result),
    };
  }
}
