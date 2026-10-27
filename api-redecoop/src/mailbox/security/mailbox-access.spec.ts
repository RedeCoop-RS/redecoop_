import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/User/entities/user.entity';
import { ROLES_KEY } from '@/_common/decorators/role.decorator';
import { IS_PUBLIC_KEY } from '@/_common/decorators/skipAuth.decorator';
import { AuthGuard } from '@/_common/guards/auth.guard';
import { MailboxController } from '../mailbox.controller';
import { assertSuperAdmin } from './mailbox-access';
import { MailboxSuperAdminGuard } from './mailbox-super-admin.guard';

function httpContext(
  user: { role?: string } | undefined,
  token = 'Bearer token',
): ExecutionContext {
  const request = { headers: { authorization: token }, user };
  return {
    getHandler: () => MailboxController,
    getClass: () => MailboxController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('acesso de super admin ao e-mail', () => {
  it('o controller exige o papel ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MailboxController)).toEqual([UserRole.ADMIN]);
  });

  it('nega cooperativa e visitante e aceita ADMIN', () => {
    expect(() => assertSuperAdmin({ role: UserRole.COOPERATIVE })).toThrow(ForbiddenException);
    expect(() => assertSuperAdmin({ role: UserRole.VISITANT })).toThrow(ForbiddenException);
    expect(() => assertSuperAdmin(undefined)).toThrow(ForbiddenException);
    expect(() => assertSuperAdmin({ role: UserRole.ADMIN })).not.toThrow();
  });

  it('o guard do módulo bloqueia quem não é ADMIN', () => {
    const guard = new MailboxSuperAdminGuard();
    expect(() => guard.canActivate(httpContext({ role: UserRole.DRIVER }))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(httpContext({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('o AuthGuard global rejeita token de cooperativa nesta rota', async () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      },
    } as unknown as Reflector;
    const jwt = {
      verifyAsync: async () => ({ role: UserRole.COOPERATIVE, userId: 9, sub: 9 }),
    } as unknown as JwtService;
    const guard = new AuthGuard(jwt, reflector);

    await expect(guard.canActivate(httpContext(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('o AuthGuard global aceita o super admin', async () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ROLES_KEY) return [UserRole.ADMIN];
        return undefined;
      },
    } as unknown as Reflector;
    const jwt = {
      verifyAsync: async () => ({
        role: UserRole.ADMIN,
        userId: 1,
        sub: 1,
        email: 'admin@redecoop.rs',
      }),
    } as unknown as JwtService;
    const guard = new AuthGuard(jwt, reflector);
    const context = httpContext(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().user.role).toBe(UserRole.ADMIN);
  });
});
