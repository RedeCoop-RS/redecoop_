import { divideQuantity } from './division';
import { formatQty, fromMinor, toMinor } from './quantity';

export const MONTH_LABELS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const;

export interface MonthShare {
  month: number;
  quantity: number;
}

export function normalizeMonths(months: number[]): number[] {
  return [
    ...new Set(months.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12)),
  ].sort((a, b) => a - b);
}

/** Divide a cota igualmente pelos meses marcados. A soma fecha com a cota. */
export function splitQuotaByMonths(quantity: number, months: number[]): MonthShare[] {
  const selected = normalizeMonths(months);
  if (selected.length === 0 || toMinor(quantity) === 0) return [];
  const result = divideQuantity(
    quantity,
    selected.map((month) => ({ id: month, maxCapacity: null })),
  );
  return result.allocations.map((allocation) => ({
    month: allocation.id,
    quantity: allocation.quantity,
  }));
}

export interface CalendarAllocationInput {
  cooperativeId: number;
  cooperativeName: string;
  quantity: number;
  months: number[];
}

export interface CalendarItemInput {
  id: number;
  description: string;
  estimatedQuantity: number;
  allocations: CalendarAllocationInput[];
}

export interface CalendarAlert {
  code: 'MONTH_WITHOUT_SUPPLIER' | 'QUOTA_WITHOUT_MONTHS' | 'ALLOCATION_SHORTFALL';
  message: string;
  itemId: number;
  month?: number;
  cooperativeId?: number;
}

export function buildCalendarAlerts(items: CalendarItemInput[]): CalendarAlert[] {
  const alerts: CalendarAlert[] = [];

  for (const item of items) {
    const allocatedMinor = item.allocations.reduce(
      (sum, allocation) => sum + toMinor(allocation.quantity),
      0,
    );
    const gap = toMinor(item.estimatedQuantity) - allocatedMinor;
    if (gap > 0) {
      alerts.push({
        code: 'ALLOCATION_SHORTFALL',
        itemId: item.id,
        message: `${item.description}: a soma das cotas não fecha com a quantidade estimada. Saldo sem alocação: ${formatQty(fromMinor(gap))}.`,
      });
    }

    const suppliers = item.allocations.filter((allocation) => toMinor(allocation.quantity) > 0);
    if (suppliers.length > 0) {
      for (let month = 1; month <= 12; month++) {
        const covered = suppliers.some((allocation) => allocation.months.includes(month));
        if (!covered) {
          alerts.push({
            code: 'MONTH_WITHOUT_SUPPLIER',
            itemId: item.id,
            month,
            message: `${item.description}: ${MONTH_LABELS[month - 1]} sem nenhum fornecedor.`,
          });
        }
      }
    }

    for (const allocation of suppliers) {
      if (normalizeMonths(allocation.months).length === 0) {
        alerts.push({
          code: 'QUOTA_WITHOUT_MONTHS',
          itemId: item.id,
          cooperativeId: allocation.cooperativeId,
          message: `${item.description}: ${allocation.cooperativeName} tem cota de ${formatQty(allocation.quantity)} e nenhum mês marcado. A soma do calendário não fecha com a cota.`,
        });
      }
    }
  }

  return alerts;
}
