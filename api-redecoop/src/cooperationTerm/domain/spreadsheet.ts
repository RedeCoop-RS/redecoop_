import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ImportedHospitalQuantity {
  hospitalUnitName: string;
  quantity: number;
}

export interface ImportedItem {
  description: string;
  unit: string;
  estimatedQuantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  hospitalQuantities: ImportedHospitalQuantity[];
}

const DESCRIPTION_HEADERS = ['descricao', 'descricao do item', 'item', 'produto', 'nome'];
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
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('A planilha não possui abas');

  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    const values = row.values as unknown[];
    const cells = values.slice(1).map((value) => cellToString(value));
    matrix.push(cells);
  });
  return rowsToItems(matrix);
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value && 'text' in value)
    return String((value as { text: unknown }).text);
  if (typeof value === 'object' && value && 'result' in value) {
    return cellToString((value as { result: unknown }).result);
  }
  if (value instanceof Date) return '';
  return String(value);
}

export function parseCsv(content: string): string[][] {
  const text = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const firstLine = text.split('\n').find((line) => line.trim()) ?? '';
  const delimiter =
    (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
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
  const headerIndex = rows.findIndex((row) => row.some((cell) => headerKey(cell) !== ''));
  if (headerIndex < 0)
    throw new BadRequestException('Não foi possível ler o cabeçalho da planilha');

  const headers = rows[headerIndex].map((cell) => headerKey(cell));
  const descriptionIndex = headers.findIndex((header) => DESCRIPTION_HEADERS.includes(header));
  if (descriptionIndex < 0) {
    throw new BadRequestException(
      'A planilha precisa da coluna Descrição (ou Item). Colunas aceitas: descrição, unidade, quantidade, valor unitário e valor total.',
    );
  }
  const unitIndex = headers.findIndex((header) => UNIT_HEADERS.includes(header));
  const quantityIndex = headers.findIndex((header) => QUANTITY_HEADERS.includes(header));
  const unitPriceIndex = headers.findIndex((header) => UNIT_PRICE_HEADERS.includes(header));
  const totalPriceIndex = headers.findIndex((header) => TOTAL_PRICE_HEADERS.includes(header));
  const known = new Set(
    [descriptionIndex, unitIndex, quantityIndex, unitPriceIndex, totalPriceIndex].filter(
      (index) => index >= 0,
    ),
  );
  const hospitalColumns = headers
    .map((header, index) => ({ header, index, original: rows[headerIndex][index]?.trim() ?? '' }))
    .filter((column) => column.header && column.original && !known.has(column.index));

  const items: ImportedItem[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const description = (row[descriptionIndex] ?? '').trim();
    if (!description) continue;
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
      description,
      unit: (unitIndex >= 0 ? row[unitIndex] : '')?.trim() || 'KG',
      estimatedQuantity:
        estimatedQuantity ?? (hospitalQuantities.length ? round3(estimatedFromHospitals) : null),
      unitPrice: unitPriceIndex >= 0 ? parseLocaleNumber(row[unitPriceIndex] ?? '') : null,
      totalPrice: totalPriceIndex >= 0 ? parseLocaleNumber(row[totalPriceIndex] ?? '') : null,
      hospitalQuantities,
    });
  }

  if (!items.length) throw new BadRequestException('Nenhum item encontrado na planilha');
  return items;
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
