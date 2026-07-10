import { Injectable } from '@nestjs/common';
import { VehicleType } from './entities/vehicleType.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { VehicleTypeSummaryDto } from './dtos/vehicleTypeResponse.dto';

@Injectable()
export class VehicleTypeService {
  constructor(
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
  ) {}

  async getMpyForVehicleType(vehicleTypeId: number): Promise<number> {
    const vehicleType = await this.vehicleTypeRepository.findOne({ where: { id: vehicleTypeId } });
    if (!vehicleType) {
      throw new Error('Tipo de veículo não encontrado');
    }
    return Number(vehicleType.mpy);
  }

  async listAll(): Promise<VehicleTypeSummaryDto[]> {
    const query = await this.vehicleTypeRepository.find({ select: ['id', 'name'] });
    return plainToInstance(VehicleTypeSummaryDto, query);
  }
}
