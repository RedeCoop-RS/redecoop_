import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@/User/entities/user.entity';

/** O papel ADMIN é o super administrador. Cooperativa não gerencia o blog. */
export function assertBlogSuperAdmin(user?: { role?: string } | null): void {
  if (!user || user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas o super administrador pode gerenciar o blog.');
  }
}
