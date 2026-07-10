import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TravelOfferService } from '../travelOffer.service';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UpdateOfferTravelDto } from '../Dtos/updateOfferTravel.dto';
import { UpdateTravelOfferUseCase } from '../useCase/updateTravelOffer.usecase';
import { CalculateOfferEstimateUseCase } from '../useCase/calculateOfferEstimate.usecase';
import { ProductsOfferTravelDto } from '../Dtos/createOfferTravel.dto';

@ApiBearerAuth()
@ApiTags('TravelOffer')
@Controller('common/travel-offer')
@Roles(UserRole.ADMIN, UserRole.COOPERATIVE)
export class CommonTravelOfferController {
  constructor(
    private readonly travelOfferService: TravelOfferService,
    private readonly updateTravelOfferUseCase: UpdateTravelOfferUseCase,
    private readonly calculateOfferEstimateUseCase: CalculateOfferEstimateUseCase,
  ) {}

  @Get('view/:id')
  @ApiOperation({ summary: 'Ver oferta da viagem' })
  async view(@Param('id', ParseIntPipe) id: number, @UserLogged() user: UserLoggedDto) {
    return await this.travelOfferService.view(id, user);
  }

  @Put(':offerId/update')
  @ApiOperation({ summary: 'Criar oferta de viagem' })
  async updateOffer(
    @Param('offerId', ParseIntPipe) id: number,
    @Body() postData: UpdateOfferTravelDto,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.updateTravelOfferUseCase.execute(id, postData, user);
  }

  @Post('estimate-offer-price')
  @ApiOperation({ summary: 'Calcular valor da oferta de viagem' })
  async calculateOfferEstimate(
    @Body('productsLoad') productsLoad: ProductsOfferTravelDto[],
    @Body('totalDistance') totalDistance: number,
    @Body('vehicleId') vehicleId: number,
  ) {
    return await this.calculateOfferEstimateUseCase.execute(totalDistance, vehicleId, productsLoad);
  }
}
