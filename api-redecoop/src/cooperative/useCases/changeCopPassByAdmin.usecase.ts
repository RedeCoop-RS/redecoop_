import { Injectable, NotFoundException } from '@nestjs/common';
import { Cooperative } from '../entities/cooperative.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '@/User/user.service';

@Injectable()
export class ChangeCoopPassByAdminUseCase {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    private readonly userService: UserService,
  ) {}

  async execute(cooperativeId: number, newPassword: string) {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id: cooperativeId },
      relations: { user: true },
    });

    if (!cooperative) {
      throw new NotFoundException('Cooperativa não encontrada!');
    }

    await this.userService.updateUser(cooperative.user, { password: newPassword });
  }
}
