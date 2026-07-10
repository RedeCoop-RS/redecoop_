import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Cooperative } from '../../cooperative/entities/cooperative.entity';
import { UserService } from '@/User/user.service';
import { BloodType, CNHCategory, Driver } from '../entities/driver.entity';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  async CheckCpfDuplicated(cpf: string): Promise<boolean> {
    return await this.driverRepository.exists({ where: { cpf } });
  }

  findAllCategoriesCNH(): string[] {
    return Object.values(CNHCategory);
  }

  findAllTypeBlood(): string[] {
    return Object.values(BloodType);
  }
}
