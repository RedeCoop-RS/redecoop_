import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@/User/entities/user.entity';
import { CooperationTermStatus } from '../enums/cooperationTerm.enums';

export type TermScope = 'full' | 'division' | 'none';

export interface TermAccess {
  canView: boolean;
  canMutate: boolean;
  canDownload: boolean;
  scope: TermScope;
}

const hidden: TermAccess = {
  canView: false,
  canMutate: false,
  canDownload: false,
  scope: 'none',
};

export interface TermAccessInput {
  role: UserRole;
  cooperativeId: number | null;
  status: CooperationTermStatus;
  divisionReleased: boolean;
  participantCooperativeIds: number[];
}

/**
 * Por hora o módulo fica só com o administrador.
 * Cooperativa, motorista e visitante não veem termo nem divisão.
 */
export function resolveTermAccess(input: TermAccessInput): TermAccess {
  if (input.role === UserRole.ADMIN) {
    return {
      canView: true,
      canMutate: input.status === CooperationTermStatus.DRAFT,
      canDownload: true,
      scope: 'full',
    };
  }

  return hidden;
}

export function assertCanMutate(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas administradores podem alterar o termo de cooperação');
  }
}

export function assertCanReadModule(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new ForbiddenException('Acesso não autorizado ao termo de cooperação');
  }
}
