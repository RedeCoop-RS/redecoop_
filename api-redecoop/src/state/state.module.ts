import { Module } from '@nestjs/common';
import { StateService } from './state.service';
import { StateController } from './controllers/state.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { State } from './entities/state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([State])],
  controllers: [StateController],
  providers: [StateService],
  exports: [StateService ]
})
export class StateModule { }
