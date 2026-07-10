import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cooperative } from '../entities/cooperative.entity';
import { Repository } from 'typeorm';
import { UserService } from '@/User/user.service';
import { UpdatePasswordCooperativeDto } from '../Dtos/updatePasswordCooperative.dto';

@Injectable()
export class UpdatePasswordCooperativeUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    private readonly userService: UserService,
  ) {}

  async execute(cooperativeId: number, data: UpdatePasswordCooperativeDto) {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id: cooperativeId },
      relations: { user: true },
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada.');
    }

    const { newPassword, repeatNewPassword, password } = data;

    if (newPassword !== repeatNewPassword) {
      throw new BadRequestException('Nova senha e confirmação de nova senha devem coincidir.');
    }

    const user = cooperative.user;

    const isValidPassword = await this.userService.isValidPassword(user, password);

    if (!isValidPassword) {
      throw new BadRequestException('Senha atual incorreta. Verifique e tente novamente.');
    }

    await this.userService.updateUser(user, { password: newPassword });
  }
}
