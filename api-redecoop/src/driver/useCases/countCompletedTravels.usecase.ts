import { Travel, TravelStatus } from '@/travel/entities/travel.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CountCompletedTripsUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
  ) {}

  async execute(driverId: number): Promise<number> {
    const totalTravels = await this.travelRepository.countBy({
      driverId,
      status: TravelStatus.Completed,
    });

    return totalTravels;
  }
}
