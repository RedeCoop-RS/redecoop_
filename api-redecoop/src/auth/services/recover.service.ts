import { HashService } from '../../_common/services/passwordHash.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { User } from '@/User/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ResetPassword } from '../entities/resetPassword.entity';
import { EmailService } from '@/email/services/email.service';

@Injectable()
export class AuthRecoverService {
  constructor(
    private readonly hashService: HashService,
    @InjectRepository(ResetPassword)
    private readonly resetPasswordRepository: Repository<ResetPassword>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({
      where: { username: email },
      relations: ['cooperative', 'visitant'],
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado!');
    }

    if (user.role == 'DRIVER') {
      throw new BadRequestException(
        'Motoristas devem solicitar a nova senha para sua cooperativa!',
      );
    }

    const token = this.generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); //10 minutes

    await this.resetPasswordRepository.save({
      user,
      token,
      expiresAt,
    });

    const name =
      user.cooperative?.companyName ?? user.visitant?.name ?? user.username;

    const dataEmail = {
      to: user.username,
      subject: 'Redefinir Senha de acesso',
      body: `<p>Olá, ${name}</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Para continuar, utilize o código abaixo:</p>
      <p><strong>Código: ${token}</strong></p>
      <p>Se você não solicitou a redefinição de senha, por favor, ignore este e-mail.</p>
      <p>Atenciosamente,</p>
      <p>Equipe Redecoop RS</p>`,
    };

    await this.emailService.sendEmail(dataEmail);
  }

  async resetPassword(params: { email: string; code: string; password: string }): Promise<void> {
    const { email, code, password } = params;

    const user = await this.userRepository.findOne({ where: { username: email } });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const resetCode = await this.resetPasswordRepository.findOne({
      where: {
        userId: user.id,
        token:code,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetCode) {
      throw new BadRequestException('Codigo inválido ou expirado');
    }

    const passwordHashed = await this.hashService.hashPassword(password);
    await this.userRepository.update({ id: user.id }, { password: passwordHashed });
    await this.resetPasswordRepository.delete({ userId: resetCode.userId });
  }

  async validateResetCode(email: string, token: string) {
    const user = await this.userRepository.findOne({ where: { username: email } });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const resetCode = await this.resetPasswordRepository.findOne({
      where: {
        userId: user.id,
        token,
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });

    if (!resetCode) {
      throw new BadRequestException('Token inválido ou expirado');
    }
  }

  private generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
