import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphDto } from '../Dtos/graph.dto';
import { Visitant } from '@/visitant/entities/visitant.entity';

@Injectable()
export class VisitantsByTypeGraphUseCase {
  constructor(
    @InjectRepository(Visitant)
    private readonly _VisitantRepository: Repository<Visitant>,
  ) {}

  async execute(): Promise<GraphDto> {
    const visitants = await this._VisitantRepository.find();

    const result = visitants.reduce(
      (acc, visitant) => {
        if (visitant.type) {
          const type = `${visitant.type.toString()}`;
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = Object.values(result).reduce((sum, count) => sum + count, 0);
    const data = Object.entries(result).map(([name, count]) => ({
      name,
      y: count,
      percentage: ((count / total) * 100).toFixed(2),
    }));
    return { data };
  }
}
