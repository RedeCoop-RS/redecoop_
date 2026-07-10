import { Injectable } from '@nestjs/common';
import { Vehicle } from './entities/vehicle.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class VehicleService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async existsVehicle(licensePlate: string) {
    return await this.vehicleRepository.exists({
      where: { licensePlate: licensePlate.toUpperCase() },
    });
  }

}
