import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperative } from '../cooperative/entities/cooperative.entity';
import { CafController } from './caf.controller';
import { CafAdminController } from './caf-admin.controller';
import { CafService } from './caf.service';
import { CafSyncService } from './caf-sync.service';
import { CafData } from './entities/caf-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CafData, Cooperative])],
  controllers: [CafController, CafAdminController],
  providers: [CafService, CafSyncService],
  exports: [CafService],
})
export class CafModule {}
