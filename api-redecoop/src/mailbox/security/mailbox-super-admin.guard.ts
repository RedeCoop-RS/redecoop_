import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { assertSuperAdmin } from './mailbox-access';

@Injectable()
export class MailboxSuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    assertSuperAdmin(request.user);
    return true;
  }
}
