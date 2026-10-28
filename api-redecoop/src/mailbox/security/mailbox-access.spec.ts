import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/User/entities/user.entity';
import { ROLES_KEY } from '@/_common/decorators/role.decorator';
import { GUARDS_METADATA } from '@nestjs/common/constants';
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
  it('o controller usa o guard de super admin e não @Roles (que viraria 401)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MailboxController)).toContain(
      MailboxSuperAdminGuard,
    );
    expect(Reflect.getMetadata(ROLES_KEY, MailboxController)).toBeUndefined();
  });

  it('cooperativa autenticada passa no AuthGuard e recebe 403 no guard do e-mail', async () => {
    const reflector = {
      getAllAndOverride: (key: string) => (key === IS_PUBLIC_KEY ? false : undefined),
    } as unknown as Reflector;
    const jwt = {
      verifyAsync: async () => ({ role: UserRole.COOPERATIVE, userId: 9, sub: 9 }),
    } as unknown as JwtService;
    const context = httpContext(undefined);
    await expect(new AuthGuard(jwt, reflector).canActivate(context)).resolves.toBe(true);
    expect(() => new MailboxSuperAdminGuard().canActivate(context)).toThrow(ForbiddenException);
  });

  it('sem token o AuthGuard global responde 401', async () => {
    const reflector = {
      getAllAndOverride: (key: string) => (key === IS_PUBLIC_KEY ? false : undefined),
    } as unknown as Reflector;
    const jwt = { verifyAsync: async () => ({}) } as unknown as JwtService;
    await expect(
      new AuthGuard(jwt, reflector).canActivate(httpContext(undefined, '')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
