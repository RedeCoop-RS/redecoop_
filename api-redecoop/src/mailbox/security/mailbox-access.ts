import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@/User/entities/user.entity';

/**
 * No RedeCoop o papel ADMIN é o super administrador do painel.
 * Cooperativa, motorista e visitante não acessam a caixa de e-mail.
 */
export function assertSuperAdmin(user?: { role?: string } | null): void {
  if (!user || user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas o super administrador pode acessar o e-mail.');
  }
}
