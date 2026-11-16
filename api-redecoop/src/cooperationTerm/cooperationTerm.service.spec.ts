import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRole } from '@/User/entities/user.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';
import { CooperationActor } from './cooperationTerm.actor';
import { CooperationTermExportService } from './cooperationTerm-export.service';
import { CooperationTermMailer } from './cooperationTerm-mailer';
import { CooperationTermService } from './cooperationTerm.service';
import { CooperationTerm } from './entities/cooperationTerm.entity';
import { CooperationTermAllocation } from './entities/cooperationTermAllocation.entity';
import { CooperationTermEmailLog } from './entities/cooperationTermEmailLog.entity';
import { CooperationTermHospitalUnit } from './entities/cooperationTermHospitalUnit.entity';
import { CooperationTermInterest } from './entities/cooperationTermInterest.entity';
import { CooperationTermItem } from './entities/cooperationTermItem.entity';
import { CooperationTermItemHospitalQty } from './entities/cooperationTermItemHospitalQty.entity';
import { CooperationTermSupplyMonth } from './entities/cooperationTermSupplyMonth.entity';
import { CooperationTermModel, CooperationTermStatus } from './enums/cooperationTerm.enums';

const admin: CooperationActor = { role: UserRole.ADMIN, userId: 1, cooperativeId: null };
const cooperative: CooperationActor = { role: UserRole.COOPERATIVE, userId: 8, cooperativeId: 10 };
const driver: CooperationActor = { role: UserRole.DRIVER, userId: 3, cooperativeId: null };

function draftTerm(overrides: Partial<CooperationTerm> = {}): CooperationTerm {
  return {
    id: 1,
    familyId: 'fam',
    version: 1,
    name: 'Edital GHC',
    processNumber: '1809/26',
    buyerInstitution: 'GHC',
    buyerEmail: 'compras@ghc.example',
    model: CooperationTermModel.GHC,
    status: CooperationTermStatus.DRAFT,
    divisionReleased: false,
    signedAt: null,
    signedByUserId: null,
    createdByUserId: 1,
    predecessorId: null,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-02T00:00:00Z'),
    hospitalUnits: [],
    emailLogs: [],
    items: [
      {
        id: 5,
        termId: 1,
        position: 1,
        description: 'ALHO',
        unit: 'KG',
        estimatedQuantity: 900,
        unitPrice: 10,
        totalPrice: 9000,
        hospitalQuantities: [],
        supplyMonths: [],
        interests: [
          {
            id: 1,
            itemId: 5,
            cooperativeId: 10,
            cooperative: {
              id: 10,
              fantasyName: 'CAAF',
              companyName: 'CAAF',
              email: 'caaf@example.com',
            },
          },
        ],
        allocations: [
          {
            id: 1,
            itemId: 5,
            cooperativeId: 10,
            quantity: 900,
            maxCapacity: null,
            cooperative: { id: 10, fantasyName: 'CAAF', companyName: 'CAAF' },
          },
        ],
      },
    ],
    ...overrides,
  } as CooperationTerm;
}

describe('CooperationTermService permissões', () => {
  let service: CooperationTermService;
  const terms = { findOne: jest.fn(), find: jest.fn(), update: jest.fn() };
  const mailer = { dispatch: jest.fn(), isConfigured: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CooperationTermService,
        { provide: getRepositoryToken(CooperationTerm), useValue: terms },
        { provide: getRepositoryToken(CooperationTermHospitalUnit), useValue: {} },
        { provide: getRepositoryToken(CooperationTermItem), useValue: {} },
        { provide: getRepositoryToken(CooperationTermItemHospitalQty), useValue: {} },
        { provide: getRepositoryToken(CooperationTermInterest), useValue: {} },
        { provide: getRepositoryToken(CooperationTermAllocation), useValue: {} },
        { provide: getRepositoryToken(CooperationTermSupplyMonth), useValue: {} },
        { provide: getRepositoryToken(CooperationTermEmailLog), useValue: {} },
        { provide: getRepositoryToken(Cooperative), useValue: {} },
        { provide: CooperationTermExportService, useValue: {} },
        { provide: CooperationTermMailer, useValue: mailer },
      ],
    }).compile();
    service = moduleRef.get(CooperationTermService);
  });

  it('cooperativa não vê rascunho', async () => {
    terms.findOne.mockResolvedValue(draftTerm());
    await expect(service.get(cooperative, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cooperativa participante vê a divisão liberada, sem editar nem baixar o documento', async () => {
    terms.findOne.mockResolvedValue(draftTerm({ divisionReleased: true }));
    terms.find.mockResolvedValue([draftTerm({ divisionReleased: true })]);
    const detail = await service.get(cooperative, 1);
    expect(detail.scope).toBe('division');
    expect(detail.canEdit).toBe(false);
    expect(detail.canDownload).toBe(false);
    expect(detail.items[0].unitPrice).toBeNull();
    expect(detail.items[0].allocations[0].quantity).toBe(900);
  });

  it('admin edita o rascunho', async () => {
    terms.findOne.mockResolvedValue(draftTerm());
    terms.find.mockResolvedValue([draftTerm()]);
    const detail = await service.get(admin, 1);
    expect(detail.canEdit).toBe(true);
    expect(detail.scope).toBe('full');
    expect(detail.items[0].unitPrice).toBe(10);
  });

  it('cooperativa não edita nem envia', async () => {
    await expect(service.update(cooperative, 1, { name: 'Outro' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.send(cooperative, 1, true)).rejects.toBeInstanceOf(ForbiddenException);
    expect(terms.findOne).not.toHaveBeenCalled();
    expect(mailer.dispatch).not.toHaveBeenCalled();
  });

  it('envio sem confirmação explícita não dispara e-mail', async () => {
    await expect(service.send(admin, 1, false)).rejects.toBeInstanceOf(BadRequestException);
    expect(mailer.dispatch).not.toHaveBeenCalled();
  });

  it('motorista não consulta o termo', async () => {
    await expect(service.get(driver, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(terms.findOne).not.toHaveBeenCalled();
  });
});
