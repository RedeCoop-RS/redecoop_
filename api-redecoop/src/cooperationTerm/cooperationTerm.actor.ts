import { UserRole } from '@/User/entities/user.entity';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';

export interface CooperationActor {
  role: UserRole;
  userId: number;
  cooperativeId: number | null;
}

export function actorFromUser(user: UserLoggedDto): CooperationActor {
  return {
    role: user.role,
    userId: user.userId ?? user.sub,
    cooperativeId: user.role === UserRole.COOPERATIVE ? user.sub : null,
  };
}
