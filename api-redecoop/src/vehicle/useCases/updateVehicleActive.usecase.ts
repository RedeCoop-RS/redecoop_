import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { Repository } from 'typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class UpdateVehicleActiveUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async execute(id: number, active: boolean, user: UserLoggedDto) {
    const vehicle = await this.vehicleRepository.findOneBy({ id });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado!');
    }

    if (user.role !== UserRole.ADMIN && vehicle.cooperativeId !== user.sub) {
      throw new BadRequestException('Você não pode alterar o status desse veículo');
    }

    if (vehicle.active === active) {
      throw new BadRequestException(`O veículo já está ${active ? 'Ativo' : 'Inativo'}`);
    }

    vehicle.active = active;

    await this.vehicleRepository.save(vehicle);
  }
}
