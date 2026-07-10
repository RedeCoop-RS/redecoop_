import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateVehicleDto } from '../Dtos/createVehicle.dto';
import { VehicleService } from '../vehicle.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { Repository } from 'typeorm';
import { VehicleType } from '@/vehicleType/entities/vehicleType.entity';

@Injectable()
export class CreateVehicleUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
    private readonly vehicleService: VehicleService,
  ) {}

  async execute(data: CreateVehicleDto) {
    const { img, typeId, maximumWeight, volume, model, licensePlate, cooperativeId } = data;

    const existsVehicle = await this.vehicleService.existsVehicle(licensePlate);

    if (existsVehicle) {
      throw new BadRequestException(
        `Já existe um veículo com a placa ${licensePlate.toLocaleUpperCase()} cadastrado`,
      );
    }

    const typeExist = await this.vehicleTypeRepository.exists({ where: { id: typeId } });
    if (!typeExist) {
      throw new BadRequestException('Tipo de veículo não existe');
    }

    const newVehicle = this.vehicleRepository.create({
      licensePlate: licensePlate.toUpperCase(),
      cooperative: { id: cooperativeId },
      type: { id: typeId },
      img,
      maximumWeight,
      volume,
      model,
    });

    await this.vehicleRepository.save(newVehicle);
  }
}
