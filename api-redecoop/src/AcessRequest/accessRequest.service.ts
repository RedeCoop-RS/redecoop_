import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccessRequest } from './entities/accessRequest.entity';
import { Repository } from 'typeorm';
import { CreateAccessRequestDto } from './Dtos/createAccessRequest.dto';
import { plainToInstance } from 'class-transformer';
import { AccessRequestDto } from './Dtos/accessRequest.dto';
import { paginate, PaginateQuery } from '@/_common/utils/paginate/paginate';

@Injectable()
export class AccessRequestService {
  constructor(
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: Repository<AccessRequest>,
  ) {}

  async create(data: CreateAccessRequestDto): Promise<void> {
    const { name, email, cnpj, address, phone } = data;
    await this.checkExistsRequester(cnpj, email);
    const visitor = this.accessRequestRepository.create({ name, email, cnpj, address, phone });
    await this.accessRequestRepository.save(visitor);
  }

  private async checkExistsRequester(cnpj: string, email: string) {
    const existingCnpj = await this.accessRequestRepository.findOne({ where: { cnpj } });

    if (existingCnpj) {
      throw new BadRequestException('Este CNPJ já foi utilizado em uma solicitação');
    }
    const existingEmail = await this.accessRequestRepository.findOne({ where: { email } });
    if (existingEmail) {
      throw new BadRequestException('Este Email já foi utilizado em uma solicitação');
    }
  }

  async list(query: PaginateQuery) {
    const paginated = await paginate(query, this.accessRequestRepository);

    const { data, ...pagination } = paginated;

    const transformData = plainToInstance(AccessRequestDto, data);

    return { data: transformData, ...pagination };
  }

  async delete(id: number) {
    await this.accessRequestRepository.delete({ id });
  }
}
