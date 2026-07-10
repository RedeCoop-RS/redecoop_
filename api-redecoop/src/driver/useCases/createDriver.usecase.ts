import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { UpdateDriverDto } from '../Dtos/updateDriver.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { Transactional } from 'typeorm-transactional';
import { UserService } from '@/User/user.service';
import { DriverService } from '../services/driver.service';
import { CreateDriverDto } from '../Dtos/createDriver.dto';

@Injectable()
export class CreateDriversUseCase {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly userService: UserService,
    private readonly driverService: DriverService,
  ) {}

  @Transactional()
  async execute(data: CreateDriverDto) {
    const { cpf, cooperativeId, password, ...createData } = data;

    const isDuplicatedCpf = await this.driverService.CheckCpfDuplicated(cpf);
    if (isDuplicatedCpf) {
      throw new BadRequestException('CPF já utilizado por outro motorista!');
    }

    const newDriver = this.driverRepository.create();

    const newUser = await this.userService.createUser({
      username: cpf,
      password,
      role: UserRole.DRIVER,
    });

    newDriver.user = newUser;
    newDriver.cooperativeId = cooperativeId;
    newDriver.cpf = cpf;

    Object.assign(newDriver, createData);

    await this.driverRepository.save(newDriver);
  }
}
