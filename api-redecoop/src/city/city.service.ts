import { Injectable } from '@nestjs/common';
import { Like, Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { CityDto } from './Dtos/city.dto';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private readonly CityRepository: Repository<City>,
  ) {}

  async findByState(stateId: number): Promise<CityDto[]> {
    const query = await this.CityRepository.find({
      where: {
        state: { id: stateId },
      },
    });

    return plainToInstance(CityDto, query);
  }

  async searchByName(name: string): Promise<CityDto[]> {
    const query = await this.CityRepository.find({
      where: { name: Like(`%${name}%`) },
      relations: ['state'],
      take: 10,
    });

    return plainToInstance(CityDto, query);
  }
}
