import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GraphService {
  constructor(
    @InjectRepository(Cooperative)
    private readonly _CooperativeRepository: Repository<Cooperative>,
  ) {}

  async CooperativesByMunicipality() {
    
  }
}
