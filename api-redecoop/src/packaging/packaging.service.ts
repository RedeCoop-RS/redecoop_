import { Injectable } from '@nestjs/common';
import { Packaging } from './entities/packaging.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PackagingDto } from './Dtos/packaging.dto';
import { CreatePackagingTypeDto } from './Dtos/createPackaging.dto';

@Injectable()
export class PackagingService {
  constructor(
    @InjectRepository(Packaging)
    private readonly packagingRepository: Repository<Packaging>,
  ) {}

  async findAll(): Promise<PackagingDto[]> {
    const query = await this.packagingRepository.find({
      select: { id: true, name: true },
    });
    return plainToInstance(PackagingDto, query);
  }

  async create(data: CreatePackagingTypeDto): Promise<void> {
    await this.packagingRepository.save(
      this.packagingRepository.create({
        name: data.name,
      }),
    );
  }
}
