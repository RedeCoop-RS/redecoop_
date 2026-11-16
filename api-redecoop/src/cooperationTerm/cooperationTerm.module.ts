import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { CooperationTermController } from './controllers/cooperationTerm.controller';
import { CooperationTerm } from './entities/cooperationTerm.entity';
import { CooperationTermAllocation } from './entities/cooperationTermAllocation.entity';
import { CooperationTermEmailLog } from './entities/cooperationTermEmailLog.entity';
import { CooperationTermHospitalUnit } from './entities/cooperationTermHospitalUnit.entity';
import { CooperationTermInterest } from './entities/cooperationTermInterest.entity';
import { CooperationTermItem } from './entities/cooperationTermItem.entity';
import { CooperationTermItemHospitalQty } from './entities/cooperationTermItemHospitalQty.entity';
import { CooperationTermSupplyMonth } from './entities/cooperationTermSupplyMonth.entity';
import { CooperationTermExportService } from './cooperationTerm-export.service';
import { CooperationTermMailer } from './cooperationTerm-mailer';
import { CooperationTermService } from './cooperationTerm.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CooperationTerm,
      CooperationTermHospitalUnit,
      CooperationTermItem,
      CooperationTermItemHospitalQty,
      CooperationTermInterest,
      CooperationTermAllocation,
      CooperationTermSupplyMonth,
      CooperationTermEmailLog,
      Cooperative,
    ]),
  ],
  controllers: [CooperationTermController],
  providers: [CooperationTermService, CooperationTermExportService, CooperationTermMailer],
})
export class CooperationTermModule {}
