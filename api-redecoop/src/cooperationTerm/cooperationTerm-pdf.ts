import PDFDocument = require('pdfkit');
import { MONTH_LABELS } from './domain/calendar';
import {
  DOCUMENT_NOTE,
  DOCUMENT_ORG,
  DocumentKind,
  DocumentLine,
  SEASONALITY_HEADER,
  buildDocumentLines,
  documentTitle,
  includesPrices,
} from './domain/document';
import { REDECOOP_LOGO_HEIGHT, REDECOOP_LOGO_PNG, REDECOOP_LOGO_WIDTH } from './domain/logo';
import { formatQty } from './domain/quantity';
import { CooperationTerm } from './entities/cooperationTerm.entity';

const INK = '#111111';
const MUTED = '#5c6570';
const BORDER = '#1f1f1f';
const BAND = '#FFF200';
const HEADER_FILL = '#F4F6F8';

const MARGIN = 24;
const LOGO_WIDTH = 84;
const LOGO_HEIGHT = (LOGO_WIDTH * REDECOOP_LOGO_HEIGHT) / REDECOOP_LOGO_WIDTH;
const BANNER_HEIGHT = LOGO_HEIGHT + 16;
const BAND_HEIGHT = 22;
const HEADER_ROW = 12;
const ROW_HEIGHT = 14;
const FOOTER_SPACE = 16;
const FONT_SIZE = 6.8;

interface Column {
  key: string;
  title: string;
  width: number;
  align: 'left' | 'center' | 'right';
  merged: boolean;
  bold?: boolean;
}

interface Group {
  lines: DocumentLine[];
  rowHeight: number;
}

export function buildTermPdf(term: CooperationTerm, kind: DocumentKind = 'term'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: documentTitle(term),
        Author: 'RedeCoop',
        Subject: kind === 'division' ? 'Planilha de divisão' : 'Termo de Cooperação',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    paint(doc, term, kind);
    paintFooters(doc, term, kind);
    doc.end();
  });
}

function paint(doc: PDFKit.PDFDocument, term: CooperationTerm, kind: DocumentKind) {
  const calendar = kind === 'term';
  const columns = buildColumns(doc, includesPrices(term), calendar);
  const groups = buildGroups(doc, buildDocumentLines(term), columns);
  const bottom = doc.page.height - MARGIN - FOOTER_SPACE;

  let y = drawBanner(doc, term, kind);
  y = drawHeader(doc, columns, y, calendar);

  if (!groups.length) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text('Nenhum item com cooperativa interessada.', MARGIN, y + 8);
    return;
  }

  for (const group of groups) {
    const height = group.rowHeight * group.lines.length;
    if (y + height > bottom) {
      doc.addPage();
      y = drawHeader(doc, columns, MARGIN, calendar);
    }
    drawGroup(doc, columns, group, y);
    y += height;
  }
}

function buildColumns(doc: PDFKit.PDFDocument, prices: boolean, calendar: boolean): Column[] {
  const usable = doc.page.width - MARGIN * 2;
  const columns: Column[] = [
    { key: 'n', title: '', width: 18, align: 'center', merged: true },
    { key: 'description', title: 'DESCRIÇÃO DO ITEM', width: 0, align: 'center', merged: true, bold: true },
    { key: 'unit', title: 'UN', width: 26, align: 'center', merged: true, bold: true },
    { key: 'estimated', title: 'Quantidade\nEstimada TOTAL', width: 56, align: 'center', merged: true, bold: true },
  ];
  if (prices) {
    columns.push({ key: 'unitPrice', title: 'VALOR\nUNITÁRIO', width: 50, align: 'center', merged: true });
    columns.push({ key: 'totalPrice', title: 'VALOR\nTOTAL', width: 58, align: 'center', merged: true });
  }
  columns.push({ key: 'cooperative', title: 'COOPERATIVAS', width: calendar ? 70 : 110, align: 'center', merged: false, bold: true });
  columns.push({ key: 'quote', title: 'QUANTIDADE P/\nCOTAÇÃO', width: calendar ? 56 : 70, align: 'center', merged: false, bold: true });
  if (calendar) {
    MONTH_LABELS.forEach((label, index) => {
      columns.push({ key: `m${index}`, title: label, width: 21.5, align: 'center', merged: false });
    });
  }
  const used = columns.reduce((sum, column) => sum + column.width, 0);
  columns[1].width = Math.max(120, usable - used);
  return columns;
}

function buildGroups(doc: PDFKit.PDFDocument, lines: DocumentLine[], columns: Column[]): Group[] {
  const groups: Group[] = [];
  for (const line of lines) {
    if (line.firstOfItem) groups.push({ lines: [], rowHeight: ROW_HEIGHT });
    groups[groups.length - 1].lines.push(line);
  }
  const descriptionWidth = columns[1].width - 8;
  doc.font('Helvetica-Bold').fontSize(FONT_SIZE);
  for (const group of groups) {
    const textHeight = doc.heightOfString(group.lines[0].description, { width: descriptionWidth });
    const needed = textHeight + 6;
    group.rowHeight = Math.max(ROW_HEIGHT, needed / group.lines.length);
  }
  return groups;
}

function drawBanner(doc: PDFKit.PDFDocument, term: CooperationTerm, kind: DocumentKind): number {
  const width = doc.page.width - MARGIN * 2;
  const top = MARGIN;

  doc.lineWidth(0.8).rect(MARGIN, top, width, BANNER_HEIGHT + BAND_HEIGHT).strokeColor(BORDER).stroke();
  doc.image(REDECOOP_LOGO_PNG, MARGIN + 10, top + (BANNER_HEIGHT - LOGO_HEIGHT) / 2, { width: LOGO_WIDTH });

  const textLeft = MARGIN + 10 + LOGO_WIDTH + 12;
  const textWidth = width - (textLeft - MARGIN) - 12;
  doc
    .font('Times-Roman')
    .fontSize(9)
    .fillColor(INK)
    .text(DOCUMENT_ORG, textLeft, top + 12, { width: textWidth, align: 'center' })
    .text(
      kind === 'division' ? 'PLANILHA DE DIVISÃO DAS QUANTIDADES PARA ELABORAÇÃO DO PROJETO DE VENDA.' : DOCUMENT_NOTE,
      textLeft,
      top + 24,
      { width: textWidth, align: 'center' },
    );

  const bandTop = top + BANNER_HEIGHT;
  doc.rect(MARGIN, bandTop, width, BAND_HEIGHT).fill(BAND);
  doc
    .lineWidth(0.8)
    .moveTo(MARGIN, bandTop)
    .lineTo(MARGIN + width, bandTop)
    .strokeColor(BORDER)
    .stroke();
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(INK)
    .text(documentTitle(term), MARGIN + 8, bandTop + 7.5, { width: width - 16, align: 'center' });

  return bandTop + BAND_HEIGHT + 6;
}

function drawHeader(doc: PDFKit.PDFDocument, columns: Column[], top: number, calendar: boolean): number {
  const total = HEADER_ROW * 2;
  let x = MARGIN;
  const monthsStart = calendar ? columns.findIndex((column) => column.key === 'm0') : -1;

  doc.lineWidth(0.5).strokeColor(BORDER);
  columns.forEach((column, index) => {
    const isMonth = monthsStart >= 0 && index >= monthsStart;
    if (isMonth) {
      doc.rect(x, top + HEADER_ROW, column.width, HEADER_ROW).fillAndStroke(HEADER_FILL, BORDER);
      cellText(doc, column.title, x, top + HEADER_ROW, column.width, HEADER_ROW, {
        bold: true,
        size: 6.2,
      });
    } else {
      doc.rect(x, top, column.width, total).fillAndStroke(HEADER_FILL, BORDER);
      cellText(doc, column.title, x, top, column.width, total, { bold: true, size: 6.2 });
    }
    x += column.width;
  });

  if (monthsStart >= 0) {
    const monthsX = MARGIN + columns.slice(0, monthsStart).reduce((sum, column) => sum + column.width, 0);
    const monthsWidth = columns.slice(monthsStart).reduce((sum, column) => sum + column.width, 0);
    doc.rect(monthsX, top, monthsWidth, HEADER_ROW).fillAndStroke(HEADER_FILL, BORDER);
    cellText(doc, SEASONALITY_HEADER, monthsX, top, monthsWidth, HEADER_ROW, { bold: true, size: 6.4 });
  }
  return top + total;
}

function drawGroup(doc: PDFKit.PDFDocument, columns: Column[], group: Group, top: number) {
  const height = group.rowHeight * group.lines.length;
  const first = group.lines[0];
  let x = MARGIN;
  doc.lineWidth(0.5).strokeColor(BORDER);

  for (const column of columns) {
    if (column.merged) {
      doc.rect(x, top, column.width, height).stroke();
      cellText(doc, mergedValue(column.key, first), x, top, column.width, height, {
        bold: column.bold,
        align: column.key === 'n' ? 'left' : column.align,
      });
    } else {
      group.lines.forEach((line, index) => {
        const rowTop = top + index * group.rowHeight;
        doc.rect(x, rowTop, column.width, group.rowHeight).stroke();
        cellText(doc, rowValue(column.key, line), x, rowTop, column.width, group.rowHeight, {
          bold: column.bold,
          align: column.align,
        });
      });
    }
    x += column.width;
  }
}

function cellText(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right' } = {},
) {
  if (!value) return;
  const size = options.size ?? FONT_SIZE;
  doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(INK);
  const padding = 3;
  const textWidth = width - padding * 2;
  const textHeight = doc.heightOfString(value, { width: textWidth, align: options.align ?? 'center' });
  const offset = Math.max(0, (height - textHeight) / 2);
  doc.text(value, x + padding, y + offset, {
    width: textWidth,
    height: height - offset,
    align: options.align ?? 'center',
    lineGap: 0,
  });
}

function mergedValue(key: string, line: DocumentLine): string {
  switch (key) {
    case 'n':
      return String(line.itemNumber);
    case 'description':
      return line.description.toUpperCase();
    case 'unit':
      return line.unit.toUpperCase();
    case 'estimated':
      return line.estimatedQuantity === null ? '' : formatQty(line.estimatedQuantity);
    case 'unitPrice':
      return line.unitPrice === null ? '' : formatMoney(line.unitPrice);
    case 'totalPrice':
      return line.totalPrice === null ? '' : formatMoney(line.totalPrice);
    default:
      return '';
  }
}

function rowValue(key: string, line: DocumentLine): string {
  if (key === 'cooperative') return line.cooperative.toUpperCase();
  if (key === 'quote') return line.quoteQuantity === null ? '' : formatQty(line.quoteQuantity);
  if (key.startsWith('m')) return line.months[Number(key.slice(1))] ? 'X' : '';
  return '';
}

function paintFooters(doc: PDFKit.PDFDocument, term: CooperationTerm, kind: DocumentKind) {
  const range = doc.bufferedPageRange();
  const label = kind === 'division' ? 'Planilha de divisão' : `Termo de Cooperação · versão ${term.version}`;
  const issued = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(
    term.signedAt && kind === 'term' ? new Date(term.signedAt) : new Date(),
  );
  const stamp = kind === 'term' && term.signedAt ? `firmado em ${issued}` : `gerado em ${issued}`;
  for (let index = 0; index < range.count; index++) {
    doc.switchToPage(range.start + index);
    // Sem margem inferior o rodapé não força uma página nova.
    doc.page.margins.bottom = 0;
    const y = doc.page.height - MARGIN - 8;
    const width = doc.page.width - MARGIN * 2;
    doc
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor(MUTED)
      .text(`${label} · ${stamp}`, MARGIN, y, { width, align: 'left', lineBreak: false })
      .text(`Página ${index + 1} de ${range.count}`, MARGIN, y, { width, align: 'right', lineBreak: false });
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
