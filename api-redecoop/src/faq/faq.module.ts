import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faq } from './entities/faq.entity';
import { AdminFaqController } from './controllers/admin.controller';
import { FaqService } from './faq.service';
import { AdminCommonController } from './controllers/common.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Faq])],
  controllers: [AdminFaqController, AdminCommonController],
  providers: [FaqService],
  exports: [],
})
export class FaqModule {}
