import { Public } from '@/_common/decorators/skipAuth.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessRequestService } from '../accessRequest.service';
import { CreateAccessRequestDto } from '../Dtos/createAccessRequest.dto';

@ApiBearerAuth()
@ApiTags('Requests')
@Controller('request')
@Public()
export class AccessRequestController {
  constructor(private readonly AccessRequestService: AccessRequestService) {}

  @Post('create')
  @ApiOperation({ summary: 'Criar Solicitação para participar da plataforma' })
  async create(@Body() postData: CreateAccessRequestDto) {
    return await this.AccessRequestService.create(postData);
  }
}
