import { Module } from '@nestjs/common';
import { VisitantService } from './visitant.service';
import { AdminVisitantController } from './controllers/admin.controller';
import { VisitantController } from './controllers/visitant.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visitant } from './entities/visitant.entity';
import { SendEmailVisitantUseCase } from './use-cases/send-email-visitant.use-case';
import { EmailModule } from '@/email/email.module';
import { EmailService } from '@/email/services/email.service';
import { SendContactEmailUseCase } from './use-cases/send-contact-email.use-case';
import { SendPublicBudgetEmailUseCase } from './use-cases/send-public-budget-email.use-case';
import { PublicVisitantController } from './controllers/public-visitant.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visitant]),
    EmailModule,
  ],
  controllers: [AdminVisitantController, VisitantController, PublicVisitantController],
  providers: [
    VisitantService,
    /* use-cases */
    {
      provide: SendEmailVisitantUseCase,
      useFactory: (visitantService: VisitantService, emailService: EmailService) => {
        return new SendEmailVisitantUseCase(visitantService, emailService);
      },
      inject: [VisitantService, EmailService],
    },
    {
      provide: SendContactEmailUseCase,
      useFactory: (emailService: EmailService) => {
        return new SendContactEmailUseCase(emailService);
      },
      inject: [EmailService],
    },
    {
      provide: SendPublicBudgetEmailUseCase,
      useFactory: (emailService: EmailService) => {
        return new SendPublicBudgetEmailUseCase(emailService);
      },
      inject: [EmailService],
    },
  ],
  exports: [VisitantService, TypeOrmModule],
})
export class VisitantModule {}