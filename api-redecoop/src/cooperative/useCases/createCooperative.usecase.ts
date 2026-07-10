import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { CreateCooperativeDto } from '../Dtos/cooperative.dto';
import { UserRole } from '@/User/entities/user.entity';
import { UserService } from '@/User/user.service';

@Injectable()
export class CreateCooperativeUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    private readonly userService: UserService,
  ) {}

  @Transactional()
  async execute(data: CreateCooperativeDto): Promise<void> {
    const { email, password, img, ...createData } = data;

    const existUser = await this.userService.existsUser(email);
    if (existUser) {
      throw new BadRequestException(
        'E-mail já utilizado por outro usúario, tente novamente com outro.',
      );
    }

    const user = await this.userService.createUser({
      username: email,
      password: password,
      role: UserRole.COOPERATIVE,
    });

    const cooperative = this.cooperativeRepository.create({
      ...createData,
      user,
      img: img?.filename,
      email,
      active: true, //novo fluxo - já inicia ativa
      registrationCompletedAt: new Date(),
    });

    await this.cooperativeRepository.save(cooperative);

    //Fluxo Mudou
    /* 
    const tokenRegistration = await this.cooperativeService.generateTokenForCooperativeSignup(
      cooperative.id,
    );

    await this.cooperativeService.sendRegistrationCompletionEmail(
      cooperative.email,
      tokenRegistration,
    ); */
  }
}
