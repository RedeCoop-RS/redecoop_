import { Controller, Get } from '@nestjs/common';
import { StateService } from '../state.service';
import { plainToInstance } from 'class-transformer';
import { StateDto } from '../Dtos/state.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/_common/decorators/skipAuth.decorator';

@ApiTags('State')
@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Public()
  @Get('list')
  @ApiOperation({ summary: 'Listar todos os estados do Brasil' })
  async list() {
    const result = await this.stateService.findAll();
    return plainToInstance(StateDto, result);
  }
}
