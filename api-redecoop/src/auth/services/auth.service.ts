import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HashService } from '../../_common/services/passwordHash.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { User, UserRole } from '@/User/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthToken } from '../entities/authToken.entity';
import { plainToInstance } from 'class-transformer';
import { UserDto } from '@/User/Dtos/user.dto';
import { AuthLoginResponseDto, ExchangeTokenResponseDto } from '../Dtos/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
    private readonly configService: ConfigService,
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async login(params: { username: string; password: string }): Promise<AuthLoginResponseDto> {
    const { username, password } = params;

    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['cooperative', 'driver.cooperative', 'visitant'],
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado, tente novamente com outra credencial');
    }

    const isValidPassword = await this.hashService.validatePassword(password, user.password);

    if (!isValidPassword) {
      throw new BadRequestException('Usuário e/ou senha incorretos!');
    }

    let userData: any | undefined;
    let token: string | undefined;
    let redirectUrl: string | undefined;

    if (user.role == 'ADMIN' || (user.role == 'COOPERATIVE' && user.cooperative)) {
      const hash = await this.generateTemporaryToken(user);
      token = hash;
      redirectUrl = this.configService.get<string>('DASHBOARD_URL') + '/autenticar/' + hash;
    }

    if (user.role === 'VISITANT' && user.visitant) {
      let payload = {
        email: user.visitant.email,
        sub: user.visitant.id,
        userId: user.id,
        role: user.role,
      };
      userData = user;
      token = this.jwtService.sign(payload, { expiresIn: '168h' });
    }

    if (user.role == 'DRIVER' && user.driver) {
      let payload = { cpf: user.driver.cpf, sub: user.driver.id, userId: user.id, role: user.role };
      token = this.jwtService.sign(payload, { expiresIn: '168h' });
      userData = user;
    }

    if (user.role !== UserRole.ADMIN && !user.driver && !user.cooperative && !user.visitant) {
      throw new NotFoundException('Papel do usuário não encontrado');
    }

    return {
      userData: userData ? plainToInstance(UserDto, userData) : undefined,
      token,
      role: user.role,
      redirectUrl,
    };
  }

  private async generateTemporaryToken(user: User) {
    const token = uuidv4();
    await this.authTokenRepository.save({
      token,
      user,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return token;
  }

  async validateTemporaryToken(token: string): Promise<ExchangeTokenResponseDto> {
    const authToken = await this.authTokenRepository.findOne({
      relations: ['user', 'user.cooperative'],
      where: {
        token,
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });

    if (!authToken) {
      throw new UnauthorizedException('Token inválido ou expirado, faça o login novamente');
    }

    const user = authToken.user;

    // ADMIN com cooperativa vinculada usa sub = cooperative.id (mesmo contrato do chat/notificações).
    const payload =
      user.role === UserRole.ADMIN
        ? user.cooperative
          ? {
              email: user.username,
              sub: user.cooperative.id,
              userId: user.id,
              role: user.role,
            }
          : {
              email: user.username,
              sub: user.id,
              userId: user.id,
              role: user.role,
            }
        : user.cooperative
          ? {
              email: user.cooperative.email,
              sub: user.cooperative.id,
              userId: user.id,
              role: user.role,
            }
          : (() => {
              throw new UnauthorizedException(
                'Conta de cooperativa incompleta: registo de cooperativa não encontrado.',
              );
            })();

    const tokenJwt = this.jwtService.sign(payload, { expiresIn: '168h' });
    await this.authTokenRepository.remove(authToken);

    return {
      token: tokenJwt,
      user: plainToInstance(UserDto, user),
    };
  }
}
