import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserLogged = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserLoggedDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
