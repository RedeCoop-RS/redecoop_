import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ImportedHospitalQuantity {
  hospitalUnitName: string;
  quantity: number;
}

export interface ImportedItem {
  itemNumber: number | null;
  description: string;
  unit: string;
  estimatedQuantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  hospitalQuantities: ImportedHospitalQuantity[];
}

const DESCRIPTION_HEADERS = ['descricao do item', 'descricao', 'produto', 'nome', 'item'];
const UNIT_HEADERS = ['unidade', 'un', 'und'];
const QUANTITY_HEADERS = [
  'quantidade',
  'quantidade estimada',
  'quantidade estimada total',
  'quantidade total',
  'qtd',
  'qtde',
];
const UNIT_PRICE_HEADERS = ['valor unitario', 'preco unitario', 'valor un', 'preco'];
const TOTAL_PRICE_HEADERS = ['valor total', 'preco total'];
const NUMBER_HEADERS = [
  '#',
  'n',
  'n.',
  'no',
  'no.',
  'nº',
  'n°',
  'num',
  'numero',
  'item n',
  'item nº',
  'item n°',
  'n item',
  'nº item',
  'n° item',
  'numero do item',
];
/** Colunas da planilha preenchida (interesse, divisão, calendário) que não são unidades hospitalares. */
const IGNORED_HEADERS = [
  'cooperativas',
  'cooperativa',
  'cooperativas interessadas',
  'quantidade p/ cotacao',
  'quantidade para cotacao',
  'qtd. cotacao',
  'sazonalidade de producao',
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
  'observacao',
  'observacoes',
  'obs',
  'marca',
  'especificacao',
  'grupo',
  'categoria',
  'lote',
  'codigo',
  'cod',
];

export interface ImportPreview {
  fileName: string;
  items: ImportedItem[];
  hospitalUnits: string[];
  missingQuantity: string[];
}

export function summarizeImport(fileName: string, items: ImportedItem[]): ImportPreview {
  const hospitalUnits: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const quantity of item.hospitalQuantities) {
      if (seen.has(quantity.hospitalUnitName)) continue;
      seen.add(quantity.hospitalUnitName);
      hospitalUnits.push(quantity.hospitalUnitName);
    }
  }
  return {
    fileName,
    items,
    hospitalUnits,
    missingQuantity: items
      .filter((item) => item.estimatedQuantity === null)
      .map((item) => item.description),
  };
}

export function parseSpreadsheet(buffer: Buffer, filename: string): ImportedItem[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return rowsToItems(parseCsv(buffer.toString('utf8')));
  }
  throw new BadRequestException('Use uma planilha .xlsx ou .csv');
}

export async function parseXlsx(buffer: Buffer): Promise<ImportedItem[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  if (!workbook.worksheets.length) throw new BadRequestException('A planilha não possui abas');

  let fallback: string[][] | null = null;
  for (const current of workbook.worksheets) {
    const matrix = sheetToMatrix(current);
    const hasDescription = matrix.some((row) =>
      row.some((cell) => DESCRIPTION_HEADERS.includes(headerKey(cell))),
    );
    if (hasDescription) return rowsToItems(matrix);
    if (!fallback && matrix.some((row) => row.some((cell) => cell.trim()))) fallback = matrix;
  }
  return rowsToItems(fallback ?? []);
}

function sheetToMatrix(sheet: ExcelJS.Worksheet): string[][] {
  const matrix: string[][] = [];
  const width = sheet.columnCount;
  sheet.eachRow((row) => {
    const last = Math.max(width, row.cellCount);
    const cells: string[] = [];
    for (let column = 1; column <= last; column++) {
      cells.push(cellToString(row.getCell(column).value));
    }
    matrix.push(cells);
  });
  return matrix;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value;
  if (value instanceof Date) return '';
  if (typeof value === 'object') {
    const record = value as { text?: unknown; result?: unknown; richText?: { text?: string }[] };
    if (Array.isArray(record.richText)) {
      return record.richText.map((part) => part.text ?? '').join('');
    }
    if ('result' in record && record.result !== undefined) return cellToString(record.result);
    if ('text' in record && record.text != null) return cellToString(record.text);
  }
  return '';
}

export function parseCsv(content: string): string[][] {
  const text = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const sample = text
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 10)
    .join('\n');
  const delimiter =
    (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

function rowsToItems(rows: string[][]): ImportedItem[] {
  if (!rows.some((row) => row.some((cell) => headerKey(cell) !== ''))) {
    throw new BadRequestException('Não foi possível ler o cabeçalho da planilha');
  }
  // Pula as linhas de título (organização, edital) que antecedem o cabeçalho.
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => DESCRIPTION_HEADERS.includes(headerKey(cell))),
  );
  if (headerIndex < 0) {
    throw new BadRequestException(
      'A planilha precisa da coluna Descrição (ou Item). Colunas aceitas: nº, descrição, unidade, quantidade, valor unitário e valor total.',
    );
  }

  const headers = rows[headerIndex].map((cell) => headerKey(cell));
  const descriptionIndex = findAlias(headers, DESCRIPTION_HEADERS);
  const unitIndex = findAlias(headers, UNIT_HEADERS);
  const quantityIndex = findAlias(headers, QUANTITY_HEADERS);
  const unitPriceIndex = findAlias(headers, UNIT_PRICE_HEADERS);
  const totalPriceIndex = findAlias(headers, TOTAL_PRICE_HEADERS);
  const dataRows = rows.slice(headerIndex + 1);
  const numberIndex = findNumberColumn(headers, descriptionIndex, dataRows);
  const known = new Set(
    [descriptionIndex, unitIndex, quantityIndex, unitPriceIndex, totalPriceIndex, numberIndex].filter(
      (index) => index >= 0,
    ),
  );
  const hospitalColumns = headers
    .map((header, index) => ({ header, index, original: rows[headerIndex][index]?.trim() ?? '' }))
    .filter(
      (column) =>
        column.header &&
        column.original &&
        !known.has(column.index) &&
        !IGNORED_HEADERS.includes(column.header),
    );

  const items: ImportedItem[] = [];
  for (const row of dataRows) {
    const description = (row[descriptionIndex] ?? '').trim();
    if (!description || DESCRIPTION_HEADERS.includes(headerKey(description))) continue;
    const itemNumber = numberIndex >= 0 ? parseItemNumber(row[numberIndex] ?? '') : null;
    const hospitalQuantities = hospitalColumns
      .map((column) => {
        const quantity = parseLocaleNumber(row[column.index] ?? '');
        if (quantity === null) return null;
        return { hospitalUnitName: column.original, quantity };
      })
      .filter((entry): entry is ImportedHospitalQuantity => entry !== null);

    const estimatedFromHospitals = hospitalQuantities.reduce(
      (sum, entry) => sum + entry.quantity,
      0,
    );
    const estimatedQuantity =
      quantityIndex >= 0 ? parseLocaleNumber(row[quantityIndex] ?? '') : null;

    items.push({
      itemNumber,
      description,
      unit: (unitIndex >= 0 ? row[unitIndex] : '')?.trim() || 'KG',
      estimatedQuantity:
        estimatedQuantity ?? (hospitalQuantities.length ? round3(estimatedFromHospitals) : null),
      unitPrice: unitPriceIndex >= 0 ? parseLocaleNumber(row[unitPriceIndex] ?? '') : null,
      totalPrice: totalPriceIndex >= 0 ? parseLocaleNumber(row[totalPriceIndex] ?? '') : null,
      hospitalQuantities,
    });
  }

  const unique = collapseRepeatedItems(items);
  if (!unique.length) throw new BadRequestException('Nenhum item encontrado na planilha');
  return unique;
}

/**
 * A planilha exportada repete o item, uma linha por cooperativa, com o nº mesclado.
 * Essas linhas são o mesmo item do edital.
 */
function collapseRepeatedItems(items: ImportedItem[]): ImportedItem[] {
  const unique: ImportedItem[] = [];
  const byNumber = new Map<number, ImportedItem>();
  for (const item of items) {
    if (item.itemNumber == null) {
      unique.push(item);
      continue;
    }
    const existing = byNumber.get(item.itemNumber);
    if (!existing) {
      byNumber.set(item.itemNumber, item);
      unique.push(item);
      continue;
    }
    if (existing.estimatedQuantity == null && item.estimatedQuantity != null) {
      existing.estimatedQuantity = item.estimatedQuantity;
    }
    if (existing.unitPrice == null && item.unitPrice != null) existing.unitPrice = item.unitPrice;
    if (existing.totalPrice == null && item.totalPrice != null) existing.totalPrice = item.totalPrice;
    for (const quantity of item.hospitalQuantities) {
      const already = existing.hospitalQuantities.some(
        (current) => headerKey(current.hospitalUnitName) === headerKey(quantity.hospitalUnitName),
      );
      if (!already) existing.hospitalQuantities.push(quantity);
    }
  }
  return unique;
}

function findAlias(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);
    if (index >= 0) return index;
  }
  return -1;
}

/** Número do item pelo cabeçalho, pela coluna "Item" ou pela coluna sem título antes da descrição. */
function findNumberColumn(headers: string[], descriptionIndex: number, rows: string[][]): number {
  const byHeader = headers.findIndex(
    (header, index) => index !== descriptionIndex && NUMBER_HEADERS.includes(header),
  );
  if (byHeader >= 0) return byHeader;
  const namedItem = headers.findIndex((header, index) => header === 'item' && index !== descriptionIndex);
  if (namedItem >= 0 && columnLooksLikeNumbers(rows, descriptionIndex, namedItem)) return namedItem;
  const candidate = descriptionIndex - 1;
  if (candidate < 0 || headers[candidate] !== '') return -1;
  return columnLooksLikeNumbers(rows, descriptionIndex, candidate) ? candidate : -1;
}

function columnLooksLikeNumbers(rows: string[][], descriptionIndex: number, column: number): boolean {
  const samples = rows
    .filter((row) => (row[descriptionIndex] ?? '').trim())
    .map((row) => (row[column] ?? '').trim())
    .filter(Boolean);
  return samples.length > 0 && samples.every((value) => parseItemNumber(value) !== null);
}

function parseItemNumber(raw: string): number | null {
  const value = parseLocaleNumber(raw);
  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function headerKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseLocaleNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'x') return null;
  let normalized = trimmed.replace(/\s/g, '');
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');
  if (hasComma && hasDot) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const parts = normalized.split('.');
    const thousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3);
    if (thousands) normalized = parts.join('');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
