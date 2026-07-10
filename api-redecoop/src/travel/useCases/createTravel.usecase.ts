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

@Injectable()
export class CreateTravelUseCase {
  constructor(
    @InjectRepository(Travel)
    private readonly travelRepository: Repository<Travel>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(TravelRoute)
    private readonly travelRouteRepository: Repository<TravelRoute>,
    private readonly mapsService: MapsService,
    private readonly travelRouteService: TravelRouteService,
  ) {}

  @Transactional()
  async execute(data: CreateTravelDto) {
    const { vehicleId, cooperativeId, driverId, startDateTime, stops } = data;

    const vehicle = await this.vehicleRepository.findOneBy({
      id: vehicleId,
      cooperative: { id: cooperativeId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veiculo não encontrado ou não faz parte da cooperativa');
    }

    const existsDriver = await this.driverRepository.existsBy({
      id: driverId,
      cooperative: { id: cooperativeId },
    });

    if (!existsDriver) {
      throw new NotFoundException('Motorista não encontrado ou não faz parte da cooperativa');
    }

    const travel = await this.travelRepository.save(
      this.travelRepository.create({
        cooperative: { id: cooperativeId },
        vehicle: { id: vehicleId },
        driver: { id: driverId },
        startDateTime: startDateTime,
      }),
    );

    const newStops: TravelRoute[] = [];
    for (const stop of stops) {
      let distance = 0;

      if (stop.order !== 1) {
        const previousStop = stops.find((s) => s.order === stop.order - 1);
        distance = await this.mapsService.getRouteDistance(
          [previousStop.coordinates.longitude, previousStop.coordinates.latitude],
          [stop.coordinates.longitude, stop.coordinates.latitude],
        );
      }

      const newStop = this.travelRouteRepository.create({
        travel,
        distance,
        address: stop.address,
        latitude: stop.coordinates.latitude,
        longitude: stop.coordinates.longitude,
        loadingWeight: stop.load,
        unloadingWeight: stop.unload,
        order: stop.order,
      });

      newStops.push(newStop);
    }

    await this.travelRouteService.processTravelRoutes(newStops, vehicle.maximumWeight);
    await this.travelRouteRepository.save(newStops);
  }
}
