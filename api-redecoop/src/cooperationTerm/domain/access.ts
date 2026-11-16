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
 * Regras confirmadas com o cliente:
 * - ADMIN cria, edita rascunho, recalcula, firma e envia.
 * - Cooperativa vê termo firmado (documento inteiro) e, se participa,
 *   a divisão liberada de um rascunho. Nunca edita e nunca vê rascunho fechado.
 * - Motorista e visitante não acessam.
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

  if (input.role !== UserRole.COOPERATIVE) return hidden;

  if (input.status === CooperationTermStatus.SIGNED) {
    return { canView: true, canMutate: false, canDownload: true, scope: 'full' };
  }

  const participates =
    input.cooperativeId != null && input.participantCooperativeIds.includes(input.cooperativeId);

  if (input.divisionReleased && participates) {
    return { canView: true, canMutate: false, canDownload: false, scope: 'division' };
  }

  return hidden;
}

export function assertCanMutate(role: UserRole): void {
  if (role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas administradores podem alterar o termo de cooperação');
  }
}

export function assertCanReadModule(role: UserRole): void {
  if (role !== UserRole.ADMIN && role !== UserRole.COOPERATIVE) {
    throw new ForbiddenException('Acesso não autorizado ao termo de cooperação');
  }
}
