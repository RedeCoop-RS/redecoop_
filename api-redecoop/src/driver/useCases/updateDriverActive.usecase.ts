import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { Driver } from '../entities/driver.entity';

@Injectable()
export class UpdateDriverActiveUseCase {
  constructor(
    @InjectRepository(Driver)
    private readonly driverepository: Repository<Driver>,
  ) {}

  async execute(id: number, active: boolean, user: UserLoggedDto) {
    const driver = await this.driverepository.findOneBy({ id });

    if (!driver) {
      throw new NotFoundException('Veículo não encontrado!');
    }

    if (user.role !== UserRole.ADMIN && driver.cooperativeId !== user.sub) {
      throw new BadRequestException('Você não pode alterar o status desse Motorista');
    }

    if (driver.active === active) {
      throw new BadRequestException(`O motorista já está ${active ? 'Ativo' : 'Inativo'}`);
    }

    driver.active = active;

    await this.driverepository.save(driver);
  }
}
