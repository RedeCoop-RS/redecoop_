import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { VehicleResponseDto } from '../Dtos/vehicleRespose.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class GetVehiclesUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async execute(id: number, user: UserLoggedDto) {
    const queryBuilder = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.cooperative', 'cooperative')
      .leftJoinAndSelect('vehicle.type', 'type')
      .where('vehicle.id = :id', { id });

    const vehicle = await queryBuilder.getOne();

    if (user.role !== UserRole.ADMIN && vehicle.cooperative.id !== user.sub) {
      throw new BadRequestException('Você não tem permissão para visualizar esse veículo');
    }

    if (!vehicle) {
      throw new NotFoundException(`Veiculo com ID ${id} não encontrado`);
    }

    return plainToInstance(VehicleResponseDto, vehicle);
  }
}
