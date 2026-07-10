import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValueRange } from './entities/valueRange.entity';
import { DistanceRangeService } from '@/distanceRange/distanceRange.service';
import { WeightRangeService } from '@/weightRange/weightRange.service';

@Injectable()
export class ValueRangeService {
  constructor(
    @InjectRepository(ValueRange)
    private readonly valueRangeRepository: Repository<ValueRange>,
    private readonly distanceRangeService: DistanceRangeService,
    private readonly weightRangeService: WeightRangeService,
  ) {}

  async getpricePerDistanceAndWeight(totalDistance: number, totalWeight: number): Promise<number> {
    const distanceRange = await this.distanceRangeService.findByDistance(totalDistance);
    const weightRange = await this.weightRangeService.findByWeight(totalWeight);

    const valueRange = await this.valueRangeRepository.findOne({
      where: {
        distanceRangeId: distanceRange.id,
        weightRangeId: weightRange.id,
      },
    });

    if (!valueRange) {
      throw new NotFoundException('Valor de frete não encontrado para os parâmetros fornecidos.');
    }

    return valueRange.value;
  }
}
