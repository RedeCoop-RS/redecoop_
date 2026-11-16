import { MONTH_LABELS } from './calendar';
import { asNumber } from './quantity';
import { CooperationTermModel } from '../enums/cooperationTerm.enums';
import { CooperationTerm } from '../entities/cooperationTerm.entity';
import { cooperativeLabel } from '../cooperationTerm.view';

export const DOCUMENT_ORG = 'ORGANIZAÇÃO COMERCIAL E LOGÍSTICA: REDECOOP';
export const DOCUMENT_NOTE = 'SOLICITAMOS O PREENCHIMENTO CONFORME O INTERESSE DE PARTICIPAÇÃO.';

export interface DocumentLine {
  itemNumber: number;
  description: string;
  unit: string;
  estimatedQuantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  cooperative: string;
  quoteQuantity: number | null;
  months: boolean[];
  firstOfItem: boolean;
  rowSpan: number;
}

export interface HospitalLine {
  itemNumber: number;
  description: string;
  unitName: string;
  quantity: number;
}

export function documentTitle(term: Pick<CooperationTerm, 'name' | 'processNumber'>): string {
  return `${term.name} - Processo ${term.processNumber}`;
}

export function buildDocumentLines(term: CooperationTerm): DocumentLine[] {
  const lines: DocumentLine[] = [];
  const items = [...(term.items ?? [])].sort((a, b) => a.position - b.position || a.id - b.id);

  items.forEach((item, index) => {
    const itemNumber = index + 1;
    const allocations = [...(item.allocations ?? [])].sort((a, b) =>
      cooperativeLabel(a.cooperative, a.cooperativeId).localeCompare(
        cooperativeLabel(b.cooperative, b.cooperativeId),
        'pt-BR',
      ),
    );
    const rows = allocations.length ? allocations : [null];
    rows.forEach((allocation, rowIndex) => {
      const months = allocation
        ? (item.supplyMonths ?? []).find(
            (entry) => entry.cooperativeId === allocation.cooperativeId,
          )?.months ?? []
        : [];
      lines.push({
        itemNumber,
        description: item.description,
        unit: item.unit,
        estimatedQuantity: rowIndex === 0 ? asNumber(item.estimatedQuantity) : null,
        unitPrice: rowIndex === 0 && item.unitPrice != null ? asNumber(item.unitPrice) : null,
        totalPrice: rowIndex === 0 && item.totalPrice != null ? asNumber(item.totalPrice) : null,
        cooperative: allocation
          ? cooperativeLabel(allocation.cooperative, allocation.cooperativeId)
          : '',
        quoteQuantity: allocation ? asNumber(allocation.quantity) : null,
        months: MONTH_LABELS.map((_, monthIndex) => months.includes(monthIndex + 1)),
        firstOfItem: rowIndex === 0,
        rowSpan: rows.length,
      });
    });
  });

  return lines;
}

export function buildHospitalLines(term: CooperationTerm): HospitalLine[] {
  if (term.model !== CooperationTermModel.GHC) return [];
  const units = [...(term.hospitalUnits ?? [])].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  );
  const unitName = new Map(units.map((unit) => [unit.id, unit.name]));
  const lines: HospitalLine[] = [];
  const items = [...(term.items ?? [])].sort((a, b) => a.position - b.position || a.id - b.id);
  items.forEach((item, index) => {
    for (const qty of item.hospitalQuantities ?? []) {
      lines.push({
        itemNumber: index + 1,
        description: item.description,
        unitName: unitName.get(qty.hospitalUnitId) ?? `Unidade #${qty.hospitalUnitId}`,
        quantity: asNumber(qty.quantity),
      });
    }
  });
  return lines;
}

export function includesPrices(term: Pick<CooperationTerm, 'model'>): boolean {
  return term.model === CooperationTermModel.STANDARD;
}
