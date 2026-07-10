import { Injectable } from '@nestjs/common';
import { TravelOfferService } from '../travelOffer.service';
import { ProductsOfferTravelDto } from '../Dtos/createOfferTravel.dto';

@Injectable()
export class CalculateOfferEstimateUseCase {
  constructor(private readonly travelOfferService: TravelOfferService) {}

  async execute(totalDistance: number, vehicleId: number, productsLoad: ProductsOfferTravelDto[]) {
    return await this.travelOfferService.calculateTravelFee(totalDistance, productsLoad, vehicleId);
  }
}
