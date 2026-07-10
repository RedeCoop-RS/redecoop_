import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { UpdateEmailCooperativeDto } from '../Dtos/updateEmailCooperative.dto';
import { UserService } from '@/User/user.service';

@Injectable()
export class UpdateEmailCooperativeLoginUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    private readonly userService: UserService,
  ) {}

  async execute(cooperativeId: number, data: UpdateEmailCooperativeDto) {
    const { email, repeatEmail, password } = data;

    const cooperative = await this.cooperativeRepository.findOne({
      where: { id: cooperativeId },
      relations: ['user'],
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada.');
    }

    if (email !== repeatEmail) {
      throw new BadRequestException('Email e confirmação de e-email devem coincidir.');
    }

    const user = cooperative.user;

    const isValidPassword = await this.userService.isValidPassword(user, password);

    if (!isValidPassword) {
      throw new BadRequestException('Senha incorreta. Verifique e tente novamente.');
    }

    await this.userService.updateUser(user, { username: email });
  }
}
