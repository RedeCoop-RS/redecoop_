import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { DistanceRange } from '@/distanceRange/entities/distanceRange.entity';

@Injectable()
export class DistanceRangeService {
  constructor(
    @InjectRepository(DistanceRange)
    private readonly distanceRangeRepository: Repository<DistanceRange>,
  ) {}

  async findByDistance(totalDistance: number): Promise<DistanceRange> {
    const distanceRange = await this.distanceRangeRepository.findOne({
      where: {
        from: LessThanOrEqual(totalDistance),
        to: MoreThanOrEqual(totalDistance),
      },
    });

    if (!distanceRange) {
      throw new NotFoundException('Faixa de distância não encontrada.');
    }

    return distanceRange;
  }
}
