import { Driver } from '@/driver/entities/driver.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Travel } from '../entities/travel.entity';
import { CreateTravelDto } from '../Dtos/createTravel.dto';
import { Vehicle } from '@/vehicle/entities/vehicle.entity';
import { Transactional } from 'typeorm-transactional';
import { MapsService } from '@/maps/maps.service';
import { TravelRoute } from '../entities/travelRoute.entity';
import { TravelRouteService } from '../services/travelRoute.service';
import { UpdateTravelDto } from '../Dtos/updateTravel.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class UpdateTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
    private readonly mapsService: MapsService,
    private readonly travelRouteService: TravelRouteService,
  ) {}

  @Transactional()
  async execute(id: number, data: UpdateTravelDto, user: UserLoggedDto) {
    const { driverId, startDateTime, stops } = data;

    const travel = await this.travelRepository.findOne({
      where: { id },
      relations: { cooperative: true, travelRoutes: true, vehicle: true },
    });

    if (!travel) {
      throw new NotFoundException('Viagem não encontrada.');
    }

    if (user.role !== UserRole.ADMIN && travel.cooperative.id !== user.sub) {
      throw new BadRequestException('Você não tem permissão para editar essa viagem.');
    }

    if (driverId) {
      const existsDriver = await this.driverRepository.existsBy({
        id: driverId,
        cooperative: { id: travel.cooperative.id },
      });

      if (!existsDriver) {
        throw new NotFoundException('Motorista não encontrado ou não faz parte da cooperativa.');
      }

      travel.driverId = driverId;
    }

    if (startDateTime) {
      travel.startDateTime = new Date(startDateTime);
    }

    await this.travelRepository.save(travel);

    if (stops && stops.length > 0) {
      let stopsUpdate: TravelRoute[] = [];
      for (const stop of stops) {
        let distance = 0;

        if (stop.order !== 1) {
          const previousStop = stops.find((s) => s.order === stop.order - 1);
          distance = await this.mapsService.getRouteDistance(
            [previousStop.coordinates.longitude, previousStop.coordinates.latitude],
            [stop.coordinates.longitude, stop.coordinates.latitude],
          );
        }

        let existingStop = travel.travelRoutes.find((route) => route.order === stop.order);

        if (existingStop) {
          existingStop.distance = distance;
          existingStop.address = stop.address;
          existingStop.latitude = stop.coordinates.latitude;
          existingStop.longitude = stop.coordinates.longitude;
          existingStop.loadingWeight = stop.load;
          existingStop.unloadingWeight = stop.unload;
        } else {
          existingStop = this.travelRouteRepository.create({
            travel,
            distance,
            address: stop.address,
            latitude: stop.coordinates.latitude,
            longitude: stop.coordinates.longitude,
            loadingWeight: stop.load,
            unloadingWeight: stop.unload,
            order: stop.order,
          });
        }
        stopsUpdate.push(existingStop);
      }
      await this.travelRouteService.processTravelRoutes(stopsUpdate, travel.vehicle.maximumWeight);
      await this.travelRouteRepository.save(stopsUpdate);
    }
  }
}
