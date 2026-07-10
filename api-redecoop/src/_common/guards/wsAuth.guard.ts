import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ROLES_KEY } from '../decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth.token;

    if (!token) {
      throw new WsException('No token provided');
    }

    try {
      const user = await this.jwtService.verifyAsync(token);
      client.data.user = user;

      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      const validateRole = requiredRoles.some((role) => user.role == role);
      if (!validateRole) {
        throw new WsException('Você não tem permissão para realizar esta ação');
      }

      return true;
    } catch (e) {
      console.error(e);
      throw new WsException('Unauthorized');
    }
  }
}
