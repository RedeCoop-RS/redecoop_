import PDFDocument = require('pdfkit');
import { MONTH_LABELS } from './domain/calendar';
import {
  DOCUMENT_NOTE,
  DOCUMENT_ORG,
  buildDocumentLines,
  documentTitle,
  includesPrices,
} from './domain/document';
import { formatQty } from './domain/quantity';
import { CooperationTerm } from './entities/cooperationTerm.entity';

const GREEN = '#009640';
const INK = '#1a1a2e';
const MUTED = '#5c6570';
const LINE = '#d7dde3';
const ZEBRAS = '#f3faf5';

interface Column {
  title: string;
  width: number;
  align: 'left' | 'center' | 'right';
  key: string;
}

export function buildTermPdf(term: CooperationTerm): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A3', layout: 'landscape', margin: 22 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    paint(doc, term);
    doc.end();
  });
}

function paint(doc: PDFKit.PDFDocument, term: CooperationTerm) {
  const columns = buildColumns(doc, includesPrices(term));
  const lines = buildDocumentLines(term);
  let y = drawBanner(doc, term);

  const drawHead = () => {
    y = drawHeader(doc, columns, y);
  };
  drawHead();

  if (!lines.length) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text('Nenhum item cadastrado.', doc.page.margins.left, y + 6);
    return;
  }

  lines.forEach((line, index) => {
    const descriptionWidth = columns[1].width - 6;
    const description = line.firstOfItem ? line.description : '';
    const textHeight = doc
      .font('Helvetica')
      .fontSize(7.5)
      .heightOfString(description || ' ', {
        width: descriptionWidth,
      });
    const rowHeight = Math.max(15, textHeight + 5);
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (y + rowHeight > bottom) {
      doc.addPage();
      y = drawBanner(doc, term);
      drawHead();
    }
    drawRow(doc, columns, line, y, rowHeight, index);
    y += rowHeight;
  });
}

function buildColumns(doc: PDFKit.PDFDocument, prices: boolean): Column[] {
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns: Column[] = [
    { key: 'n', title: '#', width: 24, align: 'center' },
    { key: 'description', title: 'DESCRIÇÃO DO ITEM', width: 0, align: 'left' },
    { key: 'unit', title: 'UN', width: 30, align: 'center' },
    { key: 'estimated', title: 'QTD. ESTIMADA', width: 64, align: 'right' },
  ];
  if (prices) {
    columns.push({ key: 'unitPrice', title: 'VALOR UNIT.', width: 58, align: 'right' });
    columns.push({ key: 'totalPrice', title: 'VALOR TOTAL', width: 58, align: 'right' });
  }
  columns.push({ key: 'cooperative', title: 'COOPERATIVAS', width: 100, align: 'left' });
  columns.push({ key: 'quote', title: 'QTD. COTAÇÃO', width: 64, align: 'right' });
  MONTH_LABELS.forEach((label, index) => {
    columns.push({ key: `m${index}`, title: label, width: 26, align: 'center' });
  });
  const used = columns.reduce((sum, column) => sum + column.width, 0);
  columns[1].width = Math.max(110, usable - used);
  return columns;
}

function drawBanner(doc: PDFKit.PDFDocument, term: CooperationTerm): number {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(GREEN)
    .text(DOCUMENT_ORG, left, doc.page.margins.top, {
      width,
      align: 'center',
    });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text(DOCUMENT_NOTE, left, doc.y + 2, {
      width,
      align: 'center',
    });
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(INK)
    .text(documentTitle(term), left, doc.y + 2, {
      width,
      align: 'center',
    });
  return doc.y + 8;
}

function drawHeader(doc: PDFKit.PDFDocument, columns: Column[], y: number): number {
  const height = 22;
  let x = doc.page.margins.left;
  columns.forEach((column) => {
    doc.rect(x, y, column.width, height).fillAndStroke(GREEN, GREEN);
    doc
      .font('Helvetica-Bold')
      .fontSize(6)
      .fillColor('#ffffff')
      .text(column.title, x + 2, y + 6, { width: column.width - 4, align: 'center' });
    x += column.width;
  });
  return y + height;
}

function drawRow(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  line: ReturnType<typeof buildDocumentLines>[number],
  y: number,
  height: number,
  index: number,
) {
  const values = rowValues(line);
  let x = doc.page.margins.left;
  columns.forEach((column) => {
    if (index % 2 === 0) doc.rect(x, y, column.width, height).fill(ZEBRAS);
    doc.rect(x, y, column.width, height).strokeColor(LINE).stroke();
    doc
      .font(column.key.startsWith('m') ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(7.5)
      .fillColor(INK)
      .text(values[column.key] ?? '', x + 2, y + 3.5, {
        width: column.width - 4,
        align: column.align,
        lineBreak: column.key === 'description',
      });
    x += column.width;
  });
}

function rowValues(line: ReturnType<typeof buildDocumentLines>[number]): Record<string, string> {
  const values: Record<string, string> = {
    n: line.firstOfItem ? String(line.itemNumber) : '',
    description: line.firstOfItem ? line.description : '',
    unit: line.firstOfItem ? line.unit : '',
    estimated: line.estimatedQuantity === null ? '' : formatQty(line.estimatedQuantity),
    unitPrice: line.unitPrice === null ? '' : formatQty(line.unitPrice),
    totalPrice: line.totalPrice === null ? '' : formatQty(line.totalPrice),
    cooperative: line.cooperative,
    quote: line.quoteQuantity === null ? '' : formatQty(line.quoteQuantity),
  };
  line.months.forEach((marked, index) => {
    values[`m${index}`] = marked ? 'X' : '';
  });
  return values;
}
