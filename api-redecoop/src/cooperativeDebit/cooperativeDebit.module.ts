import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativeDebit } from './entities/cooperativeDebit.entity';
import { Business } from '@/business/entities/business.entity';
import { CooperativeDebitService } from './cooperativeDebit.service';

@Module({
  imports: [TypeOrmModule.forFeature([CooperativeDebit, Business])],
  controllers: [],
  providers: [CooperativeDebitService],
  exports: [CooperativeDebitService]
})
export class CooperativeDebitModule {}
