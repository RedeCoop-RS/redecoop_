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

@Injectable()
export class UpdateDriversUseCase {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly userService: UserService,
    private readonly driverService: DriverService,
  ) {}

  @Transactional()
  async execute(driverId: number, data: UpdateDriverDto, user: UserLoggedDto) {
    const driver = await this.driverRepository.findOne({
      where: { id: driverId },
      relations: { user: true, cooperative: true },
    });

    if (user.role !== UserRole.ADMIN && driver.cooperative.id !== user.sub) {
      throw new BadRequestException('Você não tem permissão para atualizar esse motorista');
    }

    const { img, cpf, password, ...updateFields } = data;

    Object.assign(driver, updateFields);

    if (cpf && cpf !== driver.cpf) {
      const isDuplicatedCpf = await this.driverService.CheckCpfDuplicated(cpf);

      if (isDuplicatedCpf) {
        throw new BadRequestException('Já existe um motorista cadastrado com esse CPF');
      }

      driver.cpf = cpf;
      await this.userService.updateUser(driver.user, { username: cpf });
    }

    if (password && password.trim() !== '') {
      await this.userService.updateUser(driver.user, { password });
    }

    if (img) {
      driver.img = img;
    }

    await this.driverRepository.save(driver);
  }
}
