import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { Body, Controller, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TravelOfferService } from '../travelOffer.service';
import { CreateTravelOfferDto } from '../Dtos/createOfferTravel.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UpdateOfferTravelDto } from '../Dtos/updateOfferTravel.dto';
import { CreateTravelOfferUseCase } from '../useCase/createTravelOffer.usecase';
import { UpdateTravelOfferUseCase } from '../useCase/updateTravelOffer.usecase';

@ApiBearerAuth()
@ApiTags('TravelOffer')
@Controller('cooperative/travel-offer')
@Roles(UserRole.COOPERATIVE)
export class CooperativeTravelOfferController {
  constructor(
    private readonly travelOfferService: TravelOfferService,
    private readonly createTravelOfferUseCase: CreateTravelOfferUseCase,
  ) {}

  @Post('create-offer')
  @ApiOperation({ summary: 'Criar oferta para uma viagem' })
  async create(@Body() postData: CreateTravelOfferDto, @UserLogged() user: UserLoggedDto) {
    return await this.createTravelOfferUseCase.execute(postData, user.sub);
  }

  @Patch(':travelOfferId/approve')
  async approveOrRejectProposal(
    @Param('travelOfferId', ParseIntPipe) travelOfferId: number,
    @Body('approved') approved: boolean,
    @UserLogged() user: UserLoggedDto,
  ) {
    return await this.travelOfferService.approveOrRejectProposal(travelOfferId, approved, user);
  }
}
