import { Module } from '@nestjs/common';
import { AccessRequestController } from './controllers/accessRequest.controller';
import { AdminAccessRequestController } from './controllers/admin.controller';
import { AccessRequestService } from './accessRequest.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessRequest } from './entities/accessRequest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccessRequest])],
  controllers: [AccessRequestController, AdminAccessRequestController],
  providers: [AccessRequestService],
})
export class AccessRequestModule {}
