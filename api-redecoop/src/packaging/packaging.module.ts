import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Packaging } from './entities/packaging.entity';
import { PackagingService } from './packaging.service';
import { CommonPackagingController } from './controllers/common.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Packaging])],
  controllers: [CommonPackagingController],
  providers: [PackagingService],
  exports: [],
})
export class PackagingModule {}
