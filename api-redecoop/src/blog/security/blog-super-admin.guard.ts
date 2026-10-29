import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { assertBlogSuperAdmin } from './blog-access';

@Injectable()
export class BlogSuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    assertBlogSuperAdmin(request.user);
    return true;
  }
}
