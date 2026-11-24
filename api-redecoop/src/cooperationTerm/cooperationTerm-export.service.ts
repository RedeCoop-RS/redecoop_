import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import JSZip = require('jszip');
import { MONTH_LABELS } from './domain/calendar';
import {
  DOCUMENT_NOTE,
  DOCUMENT_ORG,
  DocumentKind,
  SEASONALITY_HEADER,
  buildDocumentLines,
  buildHospitalLines,
  documentTitle,
  includesPrices,
} from './domain/document';
import { REDECOOP_LOGO_HEIGHT, REDECOOP_LOGO_PNG, REDECOOP_LOGO_WIDTH } from './domain/logo';
import { CooperationTerm } from './entities/cooperationTerm.entity';
import { buildTermPdf } from './cooperationTerm-pdf';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EXCEL_LOGO_WIDTH = 124;
const EXCEL_LOGO_HEIGHT = Math.round((EXCEL_LOGO_WIDTH * REDECOOP_LOGO_HEIGHT) / REDECOOP_LOGO_WIDTH);
const EMU_PER_PIXEL = 9525;
const BAND = 'FFFFF200';
const HEADER_FILL = 'FFF4F6F8';
const GREEN = 'FF009640';
const DIVISION_NOTE = 'PLANILHA DE DIVISÃO DAS QUANTIDADES PARA ELABORAÇÃO DO PROJETO DE VENDA.';

interface SheetColumn {
  key: string;
  title: string;
  width: number;
  merged: boolean;
  format?: 'qty' | 'money';
}

export interface ExportedFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

@Injectable()
export class CooperationTermExportService {
  async excel(term: CooperationTerm, kind: DocumentKind = 'term'): Promise<ExportedFile> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RedeCoop';
    workbook.title = documentTitle(term);
    const calendar = kind === 'term';
    const columns = sheetColumns(includesPrices(term), calendar);
    const lastColumn = columns.length;
    const sheet = workbook.addWorksheet(calendar ? 'Termo' : 'Divisão', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
        printTitlesRow: '5:6',
      },
      views: [{ state: 'frozen', ySplit: 6 }],
      headerFooter: { oddFooter: '&L&8RedeCoop&R&8Página &P de &N' },
    });
    sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));

    this.writeBanner(workbook, sheet, term, lastColumn, calendar ? DOCUMENT_NOTE : DIVISION_NOTE);
    this.writeHeader(sheet, columns, calendar);
    this.writeLines(sheet, term, columns);

    const hospitalLines = buildHospitalLines(term);
    if (hospitalLines.length) {
      const hospitals = workbook.addWorksheet('Unidades hospitalares');
      hospitals.columns = [{ width: 6 }, { width: 46 }, { width: 34 }, { width: 16 }];
      const head = hospitals.addRow(['#', 'DESCRIÇÃO DO ITEM', 'UNIDADE HOSPITALAR', 'QUANTIDADE']);
      head.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
        cell.border = thinBorder();
      });
      hospitalLines.forEach((line) => {
        const row = hospitals.addRow([line.itemNumber, line.description, line.unitName, line.quantity]);
        row.eachCell((cell) => (cell.border = thinBorder()));
        row.getCell(4).numFmt = qtyFormat(line.quantity);
      });
    }

    const raw = Buffer.from(await workbook.xlsx.writeBuffer());
    const buffer = await lockLogoExtent(raw, EXCEL_LOGO_WIDTH, EXCEL_LOGO_HEIGHT);
    return {
      filename: `${fileSlug(term, kind)}.xlsx`,
      mimeType: XLSX,
      contentBase64: buffer.toString('base64'),
    };
  }

  async pdf(term: CooperationTerm, kind: DocumentKind = 'term'): Promise<ExportedFile> {
    const buffer = await buildTermPdf(term, kind);
    return {
      filename: `${fileSlug(term, kind)}.pdf`,
      mimeType: 'application/pdf',
      contentBase64: buffer.toString('base64'),
    };
  }

  private writeBanner(
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    term: CooperationTerm,
    lastColumn: number,
    note: string,
  ) {
    sheet.getRow(1).height = 18;
    sheet.getRow(2).height = 16;
    sheet.getRow(3).height = 16;
    sheet.getRow(4).height = 24;

    sheet.mergeCells(1, 1, 1, lastColumn);
    sheet.mergeCells(2, 1, 2, lastColumn);
    sheet.mergeCells(3, 1, 3, lastColumn);
    sheet.mergeCells(4, 1, 4, lastColumn);

    const org = sheet.getCell(1, 1);
    org.value = DOCUMENT_ORG;
    org.font = { name: 'Times New Roman', size: 11 };
    org.alignment = { horizontal: 'center', vertical: 'bottom' };

    const subtitle = sheet.getCell(2, 1);
    subtitle.value = note;
    subtitle.font = { name: 'Times New Roman', size: 11 };
    subtitle.alignment = { horizontal: 'center', vertical: 'top' };

    const band = sheet.getCell(4, 1);
    band.value = documentTitle(term);
    band.font = { name: 'Arial', size: 10 };
    band.alignment = { horizontal: 'center', vertical: 'middle' };
    band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };

    const edge: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FF1F1F1F' } };
    for (let column = 1; column <= lastColumn; column++) {
      sheet.getCell(1, column).border = { top: edge, ...(column === 1 ? { left: edge } : {}), ...(column === lastColumn ? { right: edge } : {}) };
      sheet.getCell(2, column).border = { ...(column === 1 ? { left: edge } : {}), ...(column === lastColumn ? { right: edge } : {}) };
      sheet.getCell(3, column).border = { ...(column === 1 ? { left: edge } : {}), ...(column === lastColumn ? { right: edge } : {}) };
      sheet.getCell(4, column).border = { top: edge, bottom: edge, ...(column === 1 ? { left: edge } : {}), ...(column === lastColumn ? { right: edge } : {}) };
    }

    const logo = workbook.addImage({ buffer: REDECOOP_LOGO_PNG as unknown as ExcelJS.Buffer, extension: 'png' });
    sheet.addImage(logo, {
      tl: { col: 0.15, row: 0.2 },
      ext: { width: EXCEL_LOGO_WIDTH, height: EXCEL_LOGO_HEIGHT },
      editAs: 'absolute',
    });
  }

  private writeHeader(sheet: ExcelJS.Worksheet, columns: SheetColumn[], calendar: boolean) {
    sheet.getRow(5).height = 16;
    sheet.getRow(6).height = 16;
    const monthsStart = calendar ? columns.findIndex((column) => column.key === 'm0') + 1 : 0;

    columns.forEach((column, index) => {
      const col = index + 1;
      const isMonth = monthsStart > 0 && col >= monthsStart;
      if (isMonth) {
        styleHeader(sheet.getCell(6, col), column.title);
      } else {
        sheet.mergeCells(5, col, 6, col);
        styleHeader(sheet.getCell(5, col), column.title);
      }
    });

    if (monthsStart > 0) {
      sheet.mergeCells(5, monthsStart, 5, columns.length);
      styleHeader(sheet.getCell(5, monthsStart), SEASONALITY_HEADER);
      for (let col = monthsStart; col <= columns.length; col++) {
        sheet.getCell(5, col).border = thinBorder();
      }
    }
  }

  private writeLines(sheet: ExcelJS.Worksheet, term: CooperationTerm, columns: SheetColumn[]) {
    const lines = buildDocumentLines(term);
    let rowNumber = 7;
    const groups: { start: number; span: number }[] = [];

    if (!lines.length) {
      sheet.mergeCells(rowNumber, 1, rowNumber, columns.length);
      const cell = sheet.getCell(rowNumber, 1);
      cell.value = 'Nenhum item com cooperativa interessada.';
      cell.font = { italic: true, color: { argb: 'FF5C6570' } };
      return;
    }

    for (const line of lines) {
      if (line.firstOfItem) groups.push({ start: rowNumber, span: line.rowSpan });
      const row = sheet.getRow(rowNumber);
      row.height = 16;
      columns.forEach((column, index) => {
        const cell = row.getCell(index + 1);
        const value = cellValue(column.key, line);
        cell.value = column.merged && !line.firstOfItem ? null : value;
        cell.border = thinBorder();
        cell.font = { name: 'Arial', size: 9, bold: column.key !== 'n' && !column.key.startsWith('m') };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: column.key === 'description' };
        if (typeof value === 'number' && column.format === 'qty') cell.numFmt = qtyFormat(value);
        if (typeof value === 'number' && column.format === 'money') cell.numFmt = '"R$" #,##0.00';
      });
      rowNumber += 1;
    }

    for (const group of groups) {
      if (group.span < 2) continue;
      columns.forEach((column, index) => {
        if (!column.merged) return;
        sheet.mergeCells(group.start, index + 1, group.start + group.span - 1, index + 1);
      });
    }
  }
}

function sheetColumns(prices: boolean, calendar: boolean): SheetColumn[] {
  const columns: SheetColumn[] = [
    { key: 'n', title: '', width: 5, merged: true },
    { key: 'description', title: 'DESCRIÇÃO DO ITEM', width: calendar ? 44 : 52, merged: true },
    { key: 'unit', title: 'UN', width: 7, merged: true },
    { key: 'estimated', title: 'Quantidade\nEstimada TOTAL', width: 15, merged: true, format: 'qty' },
  ];
  if (prices) {
    columns.push({ key: 'unitPrice', title: 'VALOR UNITÁRIO', width: 15, merged: true, format: 'money' });
    columns.push({ key: 'totalPrice', title: 'VALOR TOTAL', width: 16, merged: true, format: 'money' });
  }
  columns.push({ key: 'cooperative', title: 'COOPERATIVAS', width: calendar ? 18 : 26, merged: false });
  columns.push({ key: 'quote', title: 'QUANTIDADE P/\nCOTAÇÃO', width: 15, merged: false, format: 'qty' });
  if (calendar) {
    MONTH_LABELS.forEach((label, index) => {
      columns.push({ key: `m${index}`, title: label, width: 6.5, merged: false });
    });
  }
  return columns;
}

function cellValue(
  key: string,
  line: ReturnType<typeof buildDocumentLines>[number],
): string | number | null {
  switch (key) {
    case 'n':
      return line.itemNumber;
    case 'description':
      return line.description.toUpperCase();
    case 'unit':
      return line.unit.toUpperCase();
    case 'estimated':
      return line.estimatedQuantity;
    case 'unitPrice':
      return line.unitPrice;
    case 'totalPrice':
      return line.totalPrice;
    case 'cooperative':
      return line.cooperative.toUpperCase();
    case 'quote':
      return line.quoteQuantity;
    default:
      return line.months[Number(key.slice(1))] ? 'X' : null;
  }
}

function styleHeader(cell: ExcelJS.Cell, title: string) {
  cell.value = title;
  cell.font = { name: 'Arial', size: 9, bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  cell.border = thinBorder();
}

/** Inteiros sem casas; frações com até três casas, como no restante do termo. */
function qtyFormat(value: number): string {
  return Number.isInteger(value) ? '#,##0' : '#,##0.000';
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF1F1F1F' } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

/**
 * O ExcelJS grava a caixa interna da figura com 0×0. O Excel então estica a logo
 * até a primeira coluna, que é estreita, e a marca sai fina. Aqui a caixa recebe
 * o tamanho real, na proporção 120×45.
 */
async function lockLogoExtent(buffer: Buffer, width: number, height: number): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const cx = Math.round(width * EMU_PER_PIXEL);
  const cy = Math.round(height * EMU_PER_PIXEL);
  const drawings = Object.keys(zip.files).filter((name) => /^xl\/drawings\/drawing\d+\.xml$/.test(name));
  await Promise.all(
    drawings.map(async (name) => {
      const file = zip.file(name);
      if (!file) return;
      const xml = await file.async('string');
      zip.file(name, xml.replace(/<a:ext cx="0" cy="0"\/>/g, `<a:ext cx="${cx}" cy="${cy}"/>`));
    }),
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

export function fileSlug(term: Pick<CooperationTerm, 'name' | 'version'>, kind: DocumentKind = 'term'): string {
  const slug = term.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const prefix = kind === 'division' ? 'divisao' : 'termo-cooperacao';
  return `${prefix}-${slug || 'edital'}-v${term.version}`;
}
