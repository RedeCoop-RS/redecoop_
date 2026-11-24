import { MONTH_LABELS } from './calendar';
import { asNumber } from './quantity';
import { CooperationTermModel } from '../enums/cooperationTerm.enums';
import { CooperationTerm } from '../entities/cooperationTerm.entity';
import { CooperationTermItem } from '../entities/cooperationTermItem.entity';
import { cooperativeLabel, sortItems } from '../cooperationTerm.view';

export const DOCUMENT_ORG = 'ORGANIZAÇÃO COMERCIAL E LOGÍSTICA: REDECOOP';
export const DOCUMENT_NOTE = 'SOLICITAMOS O PREENCHIMENTO CONFORME O INTERESSE DE PARTICIPAÇÃO.';
export const SEASONALITY_HEADER = 'SAZONALIDADE DE PRODUÇÃO';

/** Termo firmado (com calendário) ou planilha de divisão enviada para o projeto de venda. */
export type DocumentKind = 'term' | 'division';

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

export function itemNumberOf(item: Pick<CooperationTermItem, 'itemNumber' | 'position'>): number {
  return item.itemNumber ?? item.position;
}

/**
 * Linhas do documento. Como no termo oficial, itens sem cooperativa interessada ficam de fora
 * e os demais mantêm o número do edital (a numeração pode ter lacunas).
 */
export function buildDocumentLines(term: CooperationTerm): DocumentLine[] {
  const lines: DocumentLine[] = [];

  for (const item of sortItems(term.items ?? [])) {
    const allocations = [...(item.allocations ?? [])].sort((a, b) =>
      cooperativeLabel(a.cooperative, a.cooperativeId).localeCompare(
        cooperativeLabel(b.cooperative, b.cooperativeId),
        'pt-BR',
      ),
    );
    if (!allocations.length) continue;
    allocations.forEach((allocation, rowIndex) => {
      const months =
        (item.supplyMonths ?? []).find((entry) => entry.cooperativeId === allocation.cooperativeId)
          ?.months ?? [];
      lines.push({
        itemNumber: itemNumberOf(item),
        description: item.description,
        unit: item.unit,
        estimatedQuantity: rowIndex === 0 ? asNumber(item.estimatedQuantity) : null,
        unitPrice: rowIndex === 0 && item.unitPrice != null ? asNumber(item.unitPrice) : null,
        totalPrice: rowIndex === 0 && item.totalPrice != null ? asNumber(item.totalPrice) : null,
        cooperative: cooperativeLabel(allocation.cooperative, allocation.cooperativeId),
        quoteQuantity: asNumber(allocation.quantity),
        months: MONTH_LABELS.map((_, monthIndex) => months.includes(monthIndex + 1)),
        firstOfItem: rowIndex === 0,
        rowSpan: allocations.length,
      });
    });
  }

  return lines;
}

/** Itens do edital que nenhuma cooperativa cotou e por isso não entram no documento. */
export function itemsWithoutCooperatives(term: CooperationTerm): { itemNumber: number; description: string }[] {
  return sortItems(term.items ?? [])
    .filter((item) => !(item.allocations ?? []).length)
    .map((item) => ({ itemNumber: itemNumberOf(item), description: item.description }));
}

export function buildHospitalLines(term: CooperationTerm): HospitalLine[] {
  if (term.model !== CooperationTermModel.GHC) return [];
  const units = [...(term.hospitalUnits ?? [])].sort(
    (a, b) => a.position - b.position || a.id - b.id,
  );
  const unitName = new Map(units.map((unit) => [unit.id, unit.name]));
  const lines: HospitalLine[] = [];
  for (const item of sortItems(term.items ?? [])) {
    for (const qty of item.hospitalQuantities ?? []) {
      lines.push({
        itemNumber: itemNumberOf(item),
        description: item.description,
        unitName: unitName.get(qty.hospitalUnitId) ?? `Unidade #${qty.hospitalUnitId}`,
        quantity: asNumber(qty.quantity),
      });
    }
  }
  return lines;
}

export function includesPrices(term: Pick<CooperationTerm, 'model'>): boolean {
  return term.model === CooperationTermModel.STANDARD;
}
