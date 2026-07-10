import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { State } from './entities/state.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class StateService {

    constructor(
        @InjectRepository(State)
        private readonly stateRepository: Repository<State>,
    ) { }

    async findAll() {
        return await this.stateRepository.find({ order: {name: "asc"} });
    }

}
