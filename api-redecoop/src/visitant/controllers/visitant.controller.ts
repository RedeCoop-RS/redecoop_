import { Body, Controller, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Roles } from '@/_common/decorators/role.decorator';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@/User/entities/user.entity';
import { UserLogged } from '@/_common/decorators/userLogged.decorator';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { EmailVisitantDto, EmailVisitantWithFileDto } from '../Dtos/emailVisitant.dto';
import { SendEmailVisitantUseCase } from '../use-cases/send-email-visitant.use-case';
import { MemoryStorageFileDecorator } from '@/_common/decorators/memory.decorator';

@ApiBearerAuth()
@ApiTags('Visitant')
@Controller('visitant')
export class VisitantController {
  constructor(private readonly sendEmailVisitantUseCase: SendEmailVisitantUseCase) {}

  @Post('send-budget-email')
  @Roles(UserRole.VISITANT)
  @UseInterceptors(MemoryStorageFileDecorator('files'))
  @ApiOperation({ summary: 'Enviar e-mail de orçamento como visitante' })
  @ApiConsumes('multipart/form-data')
  async sendBudgetEmail(
    @Body() emailData: EmailVisitantWithFileDto,
    @UploadedFiles() files: Express.Multer.File[],
    @UserLogged() user: UserLoggedDto,
  ) {
    return this.sendEmailVisitantUseCase.execute(user.email, emailData, files);
  }
}
