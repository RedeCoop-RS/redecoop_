import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../entities/driver.entity';
import { DriverResponseDto } from '../Dtos/driverResponse.dto';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { UserRole } from '@/User/entities/user.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class GetDriversUseCase {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
  ) {}

  async execute(id: number, user: UserLoggedDto): Promise<DriverResponseDto> {
    const queryBuilder = this.driverRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.cooperative', 'cooperative')
      .where('driver.id = :id', { id });

    const driver = await queryBuilder.getOne();

    if (user.role !== UserRole.ADMIN && driver.cooperative.id !== user.sub) {
      throw new BadRequestException(
        'Você não pode ver esse motorista pois não faz parte da sua cooperativa',
      );
    }

    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }

    return plainToInstance(DriverResponseDto, driver);
  }
}
