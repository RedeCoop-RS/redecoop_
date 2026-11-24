import { CooperationTermModel, CooperationTermStatus } from './enums/cooperationTerm.enums';
import { CalendarAlert, MONTH_LABELS, splitQuotaByMonths } from './domain/calendar';
import { buildCalendarAlerts } from './domain/calendar';
import { TermAccess } from './domain/access';
import { asNumber } from './domain/quantity';
import { CooperationTerm } from './entities/cooperationTerm.entity';
import { CooperationActor } from './cooperationTerm.actor';
import { UserRole } from '@/User/entities/user.entity';

export interface CooperationTermAllocationView {
  cooperativeId: number;
  cooperativeName: string;
  quantity: number;
  maxCapacity: number | null;
  months: number[];
  monthlyQuantities: { month: number; quantity: number }[];
}

export interface CooperationTermItemView {
  id: number;
  position: number;
  itemNumber: number;
  description: string;
  unit: string;
  estimatedQuantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  hospitalQuantities: { hospitalUnitId: number; quantity: number }[];
  interests: { cooperativeId: number; cooperativeName: string }[];
  allocations: CooperationTermAllocationView[];
}

export interface CooperationTermVersionView {
  id: number;
  version: number;
  status: CooperationTermStatus;
  signedAt: string | null;
  divisionReleased: boolean;
}

export interface CooperationTermRecipientView {
  name: string;
  email: string | null;
  kind: 'cooperative' | 'buyer';
}

export interface CooperationTermDetail {
  id: number;
  familyId: string;
  version: number;
  name: string;
  processNumber: string;
  buyerInstitution: string;
  buyerEmail: string | null;
  model: CooperationTermModel;
  status: CooperationTermStatus;
  divisionReleased: boolean;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scope: TermAccess['scope'];
  canEdit: boolean;
  canDownload: boolean;
  canSend: boolean;
  monthLabels: string[];
  hospitalUnits: { id: number; name: string; position: number }[];
  items: CooperationTermItemView[];
  alerts: CalendarAlert[];
  versions: CooperationTermVersionView[];
  recipientsPreview: CooperationTermRecipientView[];
  emailLogs: {
    id: number;
    kind: string;
    status: string;
    detail: string | null;
    createdAt: string;
    recipients: { email: string; name: string; kind: string }[];
  }[];
}

export interface CooperationTermSummary {
  id: number;
  familyId: string;
  version: number;
  name: string;
  processNumber: string;
  buyerInstitution: string;
  model: CooperationTermModel;
  status: CooperationTermStatus;
  divisionReleased: boolean;
  signedAt: string | null;
  updatedAt: string;
  itemCount: number;
  scope: 'full' | 'division';
}

export function cooperativeLabel(
  cooperative?: { fantasyName?: string | null; companyName?: string | null } | null,
  fallbackId?: number,
): string {
  const name = cooperative?.fantasyName?.trim() || cooperative?.companyName?.trim();
  return name || (fallbackId ? `Cooperativa #${fallbackId}` : 'Cooperativa');
}

/** Ordem do edital: número do item e, sem número, a posição de cadastro. */
export function sortItems<T extends { itemNumber: number | null; position: number; id: number }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      (a.itemNumber ?? a.position) - (b.itemNumber ?? b.position) ||
      a.position - b.position ||
      a.id - b.id,
  );
}

function iso(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function presentTerm(
  term: CooperationTerm,
  access: TermAccess,
  family: CooperationTerm[],
  actor: CooperationActor,
): CooperationTermDetail {
  const divisionOnly = access.scope === 'division';
  const items = sortItems(term.items ?? [])
    .map((item) => {
      const interests = [...(item.interests ?? [])]
        .map((interest) => ({
          cooperativeId: interest.cooperativeId,
          cooperativeName: cooperativeLabel(interest.cooperative, interest.cooperativeId),
        }))
        .sort((a, b) => a.cooperativeName.localeCompare(b.cooperativeName, 'pt-BR'));
      const monthsByCoop = new Map(
        (item.supplyMonths ?? []).map((entry) => [entry.cooperativeId, entry.months ?? []]),
      );
      const allocations = [...(item.allocations ?? [])]
        .map((allocation) => {
          const months = divisionOnly
            ? []
            : [...(monthsByCoop.get(allocation.cooperativeId) ?? [])];
          return {
            cooperativeId: allocation.cooperativeId,
            cooperativeName: cooperativeLabel(allocation.cooperative, allocation.cooperativeId),
            quantity: asNumber(allocation.quantity),
            maxCapacity:
              allocation.maxCapacity === null || allocation.maxCapacity === undefined
                ? null
                : asNumber(allocation.maxCapacity),
            months,
            monthlyQuantities: divisionOnly
              ? []
              : splitQuotaByMonths(asNumber(allocation.quantity), months),
          };
        })
        .sort((a, b) => a.cooperativeName.localeCompare(b.cooperativeName, 'pt-BR'));

      return {
        id: item.id,
        position: item.position,
        itemNumber: item.itemNumber ?? item.position,
        description: item.description,
        unit: item.unit,
        estimatedQuantity: asNumber(item.estimatedQuantity),
        unitPrice: divisionOnly ? null : item.unitPrice === null ? null : asNumber(item.unitPrice),
        totalPrice: divisionOnly
          ? null
          : item.totalPrice === null
            ? null
            : asNumber(item.totalPrice),
        hospitalQuantities: divisionOnly
          ? []
          : [...(item.hospitalQuantities ?? [])].map((qty) => ({
              hospitalUnitId: qty.hospitalUnitId,
              quantity: asNumber(qty.quantity),
            })),
        interests,
        allocations,
      };
    });

  const alerts = buildCalendarAlerts(
    items.map((item) => ({
      id: item.id,
      description: item.description,
      estimatedQuantity: item.estimatedQuantity,
      allocations: item.allocations.map((allocation) => ({
        cooperativeId: allocation.cooperativeId,
        cooperativeName: allocation.cooperativeName,
        quantity: allocation.quantity,
        months: allocation.months,
      })),
    })),
  ).filter((alert) => (divisionOnly ? alert.code === 'ALLOCATION_SHORTFALL' : true));

  const versions = [...family]
    .filter((version) => {
      if (actor.role === UserRole.ADMIN) return true;
      return version.status === CooperationTermStatus.SIGNED || version.id === term.id;
    })
    .sort((a, b) => b.version - a.version)
    .map((version) => ({
      id: version.id,
      version: version.version,
      status: version.status,
      signedAt: iso(version.signedAt),
      divisionReleased: version.divisionReleased,
    }));

  const seen = new Set<number>();
  const recipientsPreview: CooperationTermRecipientView[] = [];
  if (actor.role === UserRole.ADMIN) {
    for (const item of term.items ?? []) {
      for (const interest of item.interests ?? []) {
        if (seen.has(interest.cooperativeId)) continue;
        seen.add(interest.cooperativeId);
        recipientsPreview.push({
          name: cooperativeLabel(interest.cooperative, interest.cooperativeId),
          email: interest.cooperative?.email?.trim() || null,
          kind: 'cooperative',
        });
      }
    }
    recipientsPreview.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    recipientsPreview.push({
      name: term.buyerInstitution,
      email: term.buyerEmail?.trim() || null,
      kind: 'buyer',
    });
  }

  return {
    id: term.id,
    familyId: term.familyId,
    version: term.version,
    name: term.name,
    processNumber: term.processNumber,
    buyerInstitution: term.buyerInstitution,
    buyerEmail: actor.role === UserRole.ADMIN ? term.buyerEmail : null,
    model: term.model,
    status: term.status,
    divisionReleased: term.divisionReleased,
    signedAt: iso(term.signedAt),
    createdAt: iso(term.createdAt) ?? new Date(0).toISOString(),
    updatedAt: iso(term.updatedAt) ?? new Date(0).toISOString(),
    scope: access.scope,
    canEdit: access.canMutate,
    canDownload: access.canDownload,
    canSend: actor.role === UserRole.ADMIN && term.status === CooperationTermStatus.SIGNED,
    monthLabels: [...MONTH_LABELS],
    hospitalUnits: divisionOnly
      ? []
      : [...(term.hospitalUnits ?? [])]
          .sort((a, b) => a.position - b.position || a.id - b.id)
          .map((unit) => ({ id: unit.id, name: unit.name, position: unit.position })),
    items,
    alerts,
    versions,
    recipientsPreview,
    emailLogs:
      actor.role === UserRole.ADMIN
        ? [...(term.emailLogs ?? [])]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((log) => ({
              id: log.id,
              kind: log.kind ?? 'TERM',
              status: log.status,
              detail: log.detail,
              createdAt: iso(log.createdAt) ?? new Date(0).toISOString(),
              recipients: log.recipients ?? [],
            }))
        : [],
  };
}
