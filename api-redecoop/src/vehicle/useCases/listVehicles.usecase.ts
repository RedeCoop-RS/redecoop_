import { InjectRepository } from '@nestjs/typeorm';
import { Vehicle } from '../entities/vehicle.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';
import { UserRole } from '@/User/entities/user.entity';
import { plainToInstance } from 'class-transformer';
import { VehicleResponseDto } from '../Dtos/vehicleRespose.dto';
import { TravelService } from '@/travel/services/travel.service';

@Injectable()
export class ListVehiclesUseCase {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly travelService: TravelService,
  ) {}

  async execute(query: PaginateQuery, user: UserLoggedDto) {
    const queryBuilder = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.cooperative', 'cooperative')
      .leftJoinAndSelect('vehicle.type', 'type')
      .orderBy('vehicle.createdAt', 'DESC');

    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere('cooperative.id = :cooperativeId', {
        cooperativeId: user.sub,
      });
    }

    const { filter } = query;

    if (filter && filter.cooperativeId && user.role === UserRole.ADMIN) {
      queryBuilder.andWhere('cooperative.id = :cooperativeId', {
        cooperativeId: filter.cooperativeId,
      });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformData = await Promise.all(
      plainToInstance(VehicleResponseDto, data).map(async (vehicle) => {
        const travelsFinishedCount = await this.travelService.countTravelsByVehicle(vehicle.id);
        return {
          ...vehicle,
          travelsFinishedCount,
        };
      }),
    );

    return { data: transformData, ...pagination } as Paginated<VehicleResponseDto>;
  }
}
