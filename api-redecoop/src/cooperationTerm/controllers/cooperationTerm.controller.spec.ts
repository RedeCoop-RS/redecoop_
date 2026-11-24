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
  'previewImport',
  'setInterests',
  'setCapacities',
  'recalculate',
  'setDivisionReleased',
  'setCalendar',
  'sign',
  'newVersion',
  'send',
  'sendDivision',
  'list',
  'get',
  'exportExcel',
  'exportPdf',
];

describe('guards do termo de cooperação', () => {
  it('o módulo inteiro exige ADMIN', () => {
    for (const method of adminOnly) {
      const roles = Reflect.getMetadata(ROLES_KEY, CooperationTermController.prototype[method]);
      expect(roles).toEqual([UserRole.ADMIN]);
    }
  });
});
