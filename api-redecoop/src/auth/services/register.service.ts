import { BadRequestException, Injectable } from '@nestjs/common';
import { registerVisitantDto } from '../Dtos/register.dto';
import { User, UserRole } from 'src/User/entities/user.entity';
import { Transactional } from 'typeorm-transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from 'src/city/entities/city.entity';
import { Repository } from 'typeorm';
import { Visitant } from '@/visitant/entities/visitant.entity';
import { UserService } from '@/User/user.service';

@Injectable()
export class AuthRegisterService {
  constructor(
    @InjectRepository(Visitant)
    private visitantRepository: Repository<Visitant>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    private readonly userService: UserService,
  ) {}

  @Transactional()
  async registerVisitant(data: registerVisitantDto): Promise<void> {
    const { password, email, cityId, ...dataRegister } = data;

    const existCity = await this.cityRepository.exists({ where: { id: cityId } });
    if (!existCity) {
      throw new BadRequestException('Cidade informada não existe');
    }
    const existVisitant = await this.visitantRepository.exists({ where: { email } });
    if (existVisitant) {
      throw new BadRequestException('E-mail já cadastrado');
    }

    const user = await this.userService.createUser({
      username: email,
      password,
      role: UserRole.VISITANT,
    });

    await this.visitantRepository.save({
      user,
      email,
      city: { id: cityId },
      ...dataRegister,
    });
  }
}
