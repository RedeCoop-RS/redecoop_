import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactVisitantDto } from '../Dtos/contact-visitant.dto';
import { SendContactEmailUseCase } from '../use-cases/send-contact-email.use-case';

@ApiTags('Public')
@Controller('public')
export class PublicVisitantController {
  constructor(
    private readonly sendContactEmailUseCase: SendContactEmailUseCase
  ) {}

  @Post('contact')
  @ApiOperation({
    summary: 'Enviar mensagem de contato',
    description: 'Endpoint público para enviar dúvidas, sugestões ou críticas'
  })
  async sendContact(@Body() contactData: ContactVisitantDto) {
    return this.sendContactEmailUseCase.execute(contactData);
  }
}