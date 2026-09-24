import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { WeightRange } from '@/weightRange/entities/weightRange.entity';

@Injectable()
export class WeightRangeService {
  constructor(
    @InjectRepository(WeightRange)
    private readonly weightRangeRepository: Repository<WeightRange>,
  ) {}

  async findByWeight(totalWeight: number): Promise<WeightRange> {
    const weightRange = await this.weightRangeRepository.findOne({
      where: {
        from: LessThanOrEqual(totalWeight),
        to: MoreThanOrEqual(totalWeight),
      },
    });

    if (!weightRange) {
      throw new NotFoundException('Faixa de peso não encontrada.');
    }

    return weightRange;
  }
}
