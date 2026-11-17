import 'reflect-metadata';
import { ROLES_KEY } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { CooperationTermController } from './cooperationTerm.controller';

const adminOnly = [
  'create',
  'update',
  'replaceHospitalUnits',
  'createItem',
  'updateItem',
  'deleteItem',
  'importItems',
  'setInterests',
  'setCapacities',
  'recalculate',
  'setDivisionReleased',
  'setCalendar',
  'sign',
  'newVersion',
  'send',
];

const adminAndCooperative = ['list', 'get', 'exportExcel', 'exportPdf'];

describe('guards do termo de cooperação', () => {
  it('criação, edição, recálculo, firma e envio exigem ADMIN', () => {
    for (const method of adminOnly) {
      const roles = Reflect.getMetadata(ROLES_KEY, CooperationTermController.prototype[method]);
      expect(roles).toEqual([UserRole.ADMIN]);
    }
  });

  it('leitura e download ficam com admin e cooperativa, sem motorista ou visitante', () => {
    for (const method of adminAndCooperative) {
      const roles = Reflect.getMetadata(ROLES_KEY, CooperationTermController.prototype[method]);
      expect(roles).toEqual([UserRole.ADMIN, UserRole.COOPERATIVE]);
      expect(roles).not.toContain(UserRole.DRIVER);
      expect(roles).not.toContain(UserRole.VISITANT);
    }
  });
});
