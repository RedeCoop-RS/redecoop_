import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MONTH_LABELS } from './domain/calendar';
import {
  DOCUMENT_NOTE,
  DOCUMENT_ORG,
  buildDocumentLines,
  buildHospitalLines,
  documentTitle,
  includesPrices,
} from './domain/document';
import { CooperationTerm } from './entities/cooperationTerm.entity';
import { buildTermPdf } from './cooperationTerm-pdf';

const GREEN = 'FF009640';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class CooperationTermExportService {
  async excel(
    term: CooperationTerm,
  ): Promise<{ filename: string; mimeType: string; contentBase64: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RedeCoop';
    const sheet = workbook.addWorksheet('Termo', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    const prices = includesPrices(term);
    const headers = [
      '#',
      'DESCRIÇÃO DO ITEM',
      'UN',
      'QUANTIDADE ESTIMADA TOTAL',
      ...(prices ? ['VALOR UNITÁRIO', 'VALOR TOTAL'] : []),
      'COOPERATIVAS',
      'QUANTIDADE P/ COTAÇÃO',
      ...MONTH_LABELS,
    ];
    const width = headers.length;

    sheet.mergeCells(1, 1, 1, width);
    sheet.getCell(1, 1).value = DOCUMENT_ORG;
    sheet.mergeCells(2, 1, 2, width);
    sheet.getCell(2, 1).value = DOCUMENT_NOTE;
    sheet.mergeCells(3, 1, 3, width);
    sheet.getCell(3, 1).value = documentTitle(term);
    [1, 2, 3].forEach((rowNumber) => {
      const cell = sheet.getCell(rowNumber, 1);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = {
        bold: true,
        size: rowNumber === 3 ? 14 : 11,
        color: { argb: rowNumber === 2 ? 'FF5C6570' : GREEN },
      };
      sheet.getRow(rowNumber).height = 18;
    });

    const headerRow = sheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = border();
    });
    headerRow.height = 28;

    const lines = buildDocumentLines(term);
    let rowNumber = 5;
    const groups: { start: number; span: number }[] = [];
    lines.forEach((line) => {
      if (line.firstOfItem) groups.push({ start: rowNumber, span: line.rowSpan });
      const months = line.months.map((marked) => (marked ? 'X' : ''));
      const values = [
        line.firstOfItem ? line.itemNumber : null,
        line.firstOfItem ? line.description : null,
        line.firstOfItem ? line.unit : null,
        line.estimatedQuantity,
        ...(prices ? [line.unitPrice, line.totalPrice] : []),
        line.cooperative || null,
        line.quoteQuantity,
        ...months,
      ];
      const row = sheet.getRow(rowNumber);
      values.forEach((value, index) => {
        const cell = row.getCell(index + 1);
        cell.value = value;
        cell.border = border();
        cell.alignment = {
          vertical: 'middle',
          horizontal: monthColumn(index, prices) || index === 0 ? 'center' : 'left',
          wrapText: index === 1,
        };
        if (typeof value === 'number' && index !== 0) cell.numFmt = '#,##0.###';
        if (monthColumn(index, prices) && value === 'X')
          cell.font = { bold: true, color: { argb: GREEN } };
      });
      rowNumber += 1;
    });

    groups.forEach((group) => {
      if (group.span < 2) return;
      const mergeUntil = prices ? 6 : 4;
      for (let column = 1; column <= mergeUntil; column++) {
        if (column === 5 && !prices) continue;
        sheet.mergeCells(group.start, column, group.start + group.span - 1, column);
        sheet.getCell(group.start, column).alignment = {
          vertical: 'middle',
          horizontal: column === 1 || column === 3 ? 'center' : column >= 4 ? 'right' : 'left',
          wrapText: column === 2,
        };
      }
    });

    sheet.columns = headers.map((header, index) => ({
      width: index === 1 ? 42 : header.length <= 3 ? 6 : Math.min(header.length + 2, 28),
    }));

    const hospitalLines = buildHospitalLines(term);
    if (hospitalLines.length) {
      const hospitals = workbook.addWorksheet('Unidades hospitalares');
      hospitals.addRow(['#', 'DESCRIÇÃO DO ITEM', 'UNIDADE HOSPITALAR', 'QUANTIDADE']);
      hospitals.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
      });
      hospitalLines.forEach((line) => {
        hospitals.addRow([line.itemNumber, line.description, line.unitName, line.quantity]);
      });
      hospitals.columns = [{ width: 6 }, { width: 42 }, { width: 32 }, { width: 16 }];
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      filename: `${fileSlug(term)}.xlsx`,
      mimeType: XLSX,
      contentBase64: buffer.toString('base64'),
    };
  }

  async pdf(
    term: CooperationTerm,
  ): Promise<{ filename: string; mimeType: string; contentBase64: string }> {
    const buffer = await buildTermPdf(term);
    return {
      filename: `${fileSlug(term)}.pdf`,
      mimeType: 'application/pdf',
      contentBase64: buffer.toString('base64'),
    };
  }
}

function monthColumn(index: number, prices: boolean): boolean {
  const firstMonth = prices ? 8 : 6;
  return index >= firstMonth;
}

function border(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD7DDE3' } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

export function fileSlug(term: Pick<CooperationTerm, 'name' | 'version'>): string {
  const slug = term.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `termo-cooperacao-${slug || 'edital'}-v${term.version}`;
}
