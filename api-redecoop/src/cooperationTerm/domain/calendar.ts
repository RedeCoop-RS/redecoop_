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
  code: 'MONTH_WITHOUT_SUPPLIER' | 'MONTH_OVERLAP' | 'QUOTA_WITHOUT_MONTHS' | 'ALLOCATION_SHORTFALL';
  message: string;
  itemId: number;
  months?: number[];
  cooperativeId?: number;
}

/** Ex.: [1, 3, 4, 5, 6, 9] → "JAN, MAR a JUN e SET". Sequências de 3+ meses viram faixa. */
export function describeMonths(months: number[]): string {
  const selected = normalizeMonths(months);
  const parts: string[] = [];
  let start = 0;
  for (let index = 1; index <= selected.length; index++) {
    if (index < selected.length && selected[index] === selected[index - 1] + 1) continue;
    const run = selected.slice(start, index);
    if (run.length >= 3) {
      parts.push(`${MONTH_LABELS[run[0] - 1]} a ${MONTH_LABELS[run[run.length - 1] - 1]}`);
    } else {
      parts.push(...run.map((month) => MONTH_LABELS[month - 1]));
    }
    start = index;
  }
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
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
      const uncovered: number[] = [];
      for (let month = 1; month <= 12; month++) {
        if (!suppliers.some((allocation) => allocation.months.includes(month))) uncovered.push(month);
      }
      if (uncovered.length === 12) {
        alerts.push({
          code: 'MONTH_WITHOUT_SUPPLIER',
          itemId: item.id,
          months: uncovered,
          message: `${item.description}: nenhum mês tem fornecedor marcado.`,
        });
      } else if (uncovered.length > 0) {
        const count = uncovered.length === 1 ? '1 mês' : `${uncovered.length} meses`;
        alerts.push({
          code: 'MONTH_WITHOUT_SUPPLIER',
          itemId: item.id,
          months: uncovered,
          message: `${item.description}: sem fornecedor em ${describeMonths(uncovered)} (${count}).`,
        });
      }

      // No termo oficial as cooperativas se revezam: cada mês tem um fornecedor por item.
      const overlap: number[] = [];
      for (let month = 1; month <= 12; month++) {
        const count = suppliers.filter((allocation) => allocation.months.includes(month)).length;
        if (count > 1) overlap.push(month);
      }
      if (overlap.length > 0) {
        alerts.push({
          code: 'MONTH_OVERLAP',
          itemId: item.id,
          months: overlap,
          message: `${item.description}: mais de uma cooperativa entrega em ${describeMonths(overlap)}.`,
        });
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
