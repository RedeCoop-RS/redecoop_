import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { HashService } from '@/_common/services/passwordHash.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly hashPasswordService: HashService,
  ) {}

  async existsUser(username: string): Promise<boolean> {
    return await this.userRepository.exists({ where: { username } });
  }

  async findByUsername(username: string): Promise<User> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async createUser(params: { username: string; password: string; role: UserRole }): Promise<User> {
    const { password, ...data } = params;
    const passwordHashed = await this.hashPasswordService.hashPassword(password);
    const newUser = this.userRepository.create({ password: passwordHashed, ...data });
    return await this.userRepository.save(newUser);
  }

  async updateUser(user: User, params: { username?: string; password?: string }): Promise<User> {
    const { password, username } = params;

    if (!user) {
      throw new NotFoundException('Usuario não encontrado.');
    }

    if (username) {
      user.username = username;
    }
    if (password && password.trim() !== '') {
      user.password = await this.hashPasswordService.hashPassword(password);
    }
    return await this.userRepository.save(user);
  }

  async isValidPassword(user: User, password: string): Promise<Boolean> {
    if (!user) {
      throw new NotFoundException('Usuario não encontrado.');
    }

    return await this.hashPasswordService.validatePassword(password, user.password);
  }
}
