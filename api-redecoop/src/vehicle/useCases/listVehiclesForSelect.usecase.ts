import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleResponseDto } from '../Dtos/vehicleRespose.dto';

@Injectable()
export class ListVehiclesForSelectUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async execute(user: UserLoggedDto, cooperativeId: number) {
    const queryBuilder = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoin('vehicle.cooperative', 'cooperative')
      .where('vehicle.active = :active', { active: true })
      .select(['vehicle.id', 'vehicle.model','vehicle.licensePlate','vehicle.maximumWeight','vehicle.volume'])
      .orderBy('vehicle.createdAt', 'DESC');

    if (!cooperativeId) {
      throw new BadRequestException('O parâmetro cooperativeId é obrigatório');
    }

    if (user.role !== UserRole.ADMIN && user.sub !== cooperativeId) {
      throw new BadRequestException('Você não tem permissão para realizar esta ação.');
    }

    queryBuilder.andWhere('vehicle.cooperativeId = :cooperativeId', {
      cooperativeId,
    });

    const drivers = await queryBuilder.getMany();

    return plainToInstance(VehicleResponseDto, drivers);
  }
}
