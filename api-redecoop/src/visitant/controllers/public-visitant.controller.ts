import { Public } from '@/_common/decorators/skipAuth.decorator';
import { MemoryStorageFileDecorator } from '@/_common/decorators/memory.decorator';
import { Body, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactVisitantDto } from '../Dtos/contact-visitant.dto';
import { PublicBudgetDto } from '../Dtos/public-budget.dto';
import { SendContactEmailUseCase } from '../use-cases/send-contact-email.use-case';
import { SendPublicBudgetEmailUseCase } from '../use-cases/send-public-budget-email.use-case';

@ApiTags('Public')
@Controller('public')
@Public()
export class PublicVisitantController {
  constructor(
    private readonly sendContactEmailUseCase: SendContactEmailUseCase,
    private readonly sendPublicBudgetEmailUseCase: SendPublicBudgetEmailUseCase,
  ) {}

  @Post('contact')
  @ApiOperation({
    summary: 'Enviar mensagem de contato',
    description: 'Endpoint público para enviar dúvidas, sugestões ou críticas'
  })
  async sendContact(@Body() contactData: ContactVisitantDto) {
    return this.sendContactEmailUseCase.execute(contactData);
  }

  @Post('budget')
  @UseInterceptors(MemoryStorageFileDecorator('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Solicitar orçamento',
    description: 'Endpoint público para solicitar orçamento às cooperativas',
  })
  async sendBudget(
    @Body() budgetData: PublicBudgetDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.sendPublicBudgetEmailUseCase.execute(budgetData, files);
  }
}