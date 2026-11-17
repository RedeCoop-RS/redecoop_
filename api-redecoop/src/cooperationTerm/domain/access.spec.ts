import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@/User/entities/user.entity';
import { CooperationTermStatus } from '../enums/cooperationTerm.enums';
import { assertCanMutate, assertCanReadModule, resolveTermAccess } from './access';

const draft = {
  status: CooperationTermStatus.DRAFT,
  divisionReleased: false,
  participantCooperativeIds: [10, 20],
};

describe('permissões do termo de cooperação', () => {
  it('cooperativa não vê rascunho e não edita', () => {
    const access = resolveTermAccess({
      role: UserRole.COOPERATIVE,
      cooperativeId: 10,
      ...draft,
    });

    expect(access.canView).toBe(false);
    expect(access.canMutate).toBe(false);
    expect(access.canDownload).toBe(false);
    expect(access.scope).toBe('none');
    expect(() => assertCanMutate(UserRole.COOPERATIVE)).toThrow(ForbiddenException);
  });

  it('cooperativa participante vê só a divisão quando ela foi liberada', () => {
    const access = resolveTermAccess({
      role: UserRole.COOPERATIVE,
      cooperativeId: 10,
      ...draft,
      divisionReleased: true,
    });

    expect(access.canView).toBe(true);
    expect(access.canMutate).toBe(false);
    expect(access.canDownload).toBe(false);
    expect(access.scope).toBe('division');
  });

  it('cooperativa que não participa não vê a divisão liberada de um rascunho', () => {
    const access = resolveTermAccess({
      role: UserRole.COOPERATIVE,
      cooperativeId: 99,
      ...draft,
      divisionReleased: true,
    });

    expect(access.canView).toBe(false);
  });

  it('cooperativa vê o termo firmado inteiro, sem editar', () => {
    const access = resolveTermAccess({
      role: UserRole.COOPERATIVE,
      cooperativeId: 99,
      status: CooperationTermStatus.SIGNED,
      divisionReleased: false,
      participantCooperativeIds: [10],
    });

    expect(access.canView).toBe(true);
    expect(access.canMutate).toBe(false);
    expect(access.canDownload).toBe(true);
    expect(access.scope).toBe('full');
  });

  it('admin edita rascunho e o termo firmado fica somente leitura', () => {
    const draftAccess = resolveTermAccess({
      role: UserRole.ADMIN,
      cooperativeId: null,
      ...draft,
    });
    const signedAccess = resolveTermAccess({
      role: UserRole.ADMIN,
      cooperativeId: null,
      status: CooperationTermStatus.SIGNED,
      divisionReleased: true,
      participantCooperativeIds: [],
    });

    expect(draftAccess.canMutate).toBe(true);
    expect(draftAccess.canView).toBe(true);
    expect(draftAccess.canDownload).toBe(true);
    expect(signedAccess.canMutate).toBe(false);
    expect(signedAccess.canView).toBe(true);
    expect(() => assertCanMutate(UserRole.ADMIN)).not.toThrow();
  });

  it('motorista e visitante não acessam o módulo', () => {
    for (const role of [UserRole.DRIVER, UserRole.VISITANT]) {
      const access = resolveTermAccess({
        role,
        cooperativeId: null,
        status: CooperationTermStatus.SIGNED,
        divisionReleased: true,
        participantCooperativeIds: [1],
      });
      expect(access.canView).toBe(false);
      expect(access.canMutate).toBe(false);
      expect(() => assertCanReadModule(role)).toThrow(ForbiddenException);
      expect(() => assertCanMutate(role)).toThrow(ForbiddenException);
    }
  });
});
