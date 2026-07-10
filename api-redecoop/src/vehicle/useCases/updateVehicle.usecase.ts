import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto } from '../Dtos/createVehicle.dto';
import { VehicleService } from '../vehicle.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { Repository } from 'typeorm';
import { VehicleType } from '@/vehicleType/entities/vehicleType.entity';
import { UpdateVehicleDto } from '../Dtos/updateVehicle.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';

@Injectable()
export class UpdateVehicleUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
    private readonly vehicleService: VehicleService,
  ) {}

  async execute(data: UpdateVehicleDto, id: number, user: UserLoggedDto) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: ['cooperative'],
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    if (user.role !== 'ADMIN') {
      if (vehicle.cooperative.id !== user.sub) {
        throw new BadRequestException('Você não tem permissão para atualizar esse motorista');
      }
    } else {
      delete data.cooperativeId;
    }

    const { licensePlate, typeId, cooperativeId, img, ...updateFields } = data;

    if (licensePlate) {
      const isDuplicateVehicle = await this.vehicleService.existsVehicle(licensePlate);

      if (isDuplicateVehicle && vehicle.licensePlate !== licensePlate) {
        throw new BadRequestException(
          `Já existe um veículo com a placa ${licensePlate.toLocaleUpperCase()} cadastrado`,
        );
      }

      vehicle.licensePlate = licensePlate.toLocaleUpperCase();
    }

    Object.assign(vehicle, updateFields);

    if (img) {
      vehicle.img = img;
    }

    if (typeId) {
      const typeExist = await this.vehicleTypeRepository.exists({ where: { id: typeId } });
      if (!typeExist) {
        throw new BadRequestException('Tipo de veículo não existe');
      }
      vehicle.typeId = typeId;
    }

    await this.vehicleRepository.save(vehicle);
  }
}
