import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphDto } from '../Dtos/graph.dto';
import { Visitant } from '@/visitant/entities/visitant.entity';

@Injectable()
export class VisitantsByMunicipalityGraphUseCase {
  constructor(
    @InjectRepository(Visitant)
    private readonly _VisitantRepository: Repository<Visitant>,
  ) {}

  async execute(): Promise<GraphDto> {
    const visitants = await this._VisitantRepository.find({
      relations: { city: true },
    });

    const result = visitants.reduce(
      (acc, visitant) => {
        if (visitant.city) {
          const cityName = visitant.city.name;
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
