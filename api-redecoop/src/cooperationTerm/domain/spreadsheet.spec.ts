import * as ExcelJS from 'exceljs';
import { parseCsv, parseLocaleNumber, parseSpreadsheet, parseXlsx } from './spreadsheet';

describe('parseSpreadsheet', () => {
  it('lê CSV com ponto e vírgula e número no formato brasileiro', () => {
    const csv = [
      'Descrição;Unidade;Quantidade;Valor unitário;Valor total',
      'ALHO FEMEA HIGIENIZADO;KG;1.296;12,50;16200,00',
      'CEBOLA HIGIENIZADA;KG;900;8,00;7200',
    ].join('\n');

    const items = parseSpreadsheet(Buffer.from(csv, 'utf8'), 'itens.csv');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      description: 'ALHO FEMEA HIGIENIZADO',
      unit: 'KG',
      estimatedQuantity: 1296,
      unitPrice: 12.5,
      totalPrice: 16200,
    });
    expect(items[1].estimatedQuantity).toBe(900);
  });

  it('trata colunas extras como unidades hospitalares', () => {
    const csv = 'descricao,unidade,HOSPITAL A,HOSPITAL B\nALFACE,KG,"10,5",4\n';
    const items = parseSpreadsheet(Buffer.from(csv, 'utf8'), 'ghc.csv');
    expect(items[0].hospitalQuantities).toEqual([
      { hospitalUnitName: 'HOSPITAL A', quantity: 10.5 },
      { hospitalUnitName: 'HOSPITAL B', quantity: 4 },
    ]);
    expect(items[0].estimatedQuantity).toBe(14.5);
  });

  it('mantém o número do item do edital, mesmo com lacunas', () => {
    const csv = ['Nº;Descrição;UN;Quantidade', '7;BATATA INGLESA;KG;41400', '9;BETERRABA;KG;19200'].join(
      '\n',
    );
    const items = parseSpreadsheet(Buffer.from(csv, 'utf8'), 'edital.csv');
    expect(items.map((item) => item.itemNumber)).toEqual([7, 9]);
  });

  it('pula as linhas de título e ignora colunas da planilha já preenchida', () => {
    const csv = [
      'ORGANIZAÇÃO COMERCIAL E LOGÍSTICA: REDECOOP',
      'Edital de Chamada Pública GHC - Processo 1809/26',
      ';DESCRIÇÃO DO ITEM;UN;Quantidade Estimada TOTAL;COOPERATIVAS;QUANTIDADE P/ COTAÇÃO;JAN;FEV',
      '1;AIPIM HIGIENIZADO;KG;11880;CAAF;3960;X;',
      '3;ALHO FEMEA HIGIENIZADO;KG;1296;CAAF;1296;X;X',
    ].join('\n');
    const items = parseSpreadsheet(Buffer.from(csv, 'utf8'), 'termo.csv');
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      itemNumber: 1,
      description: 'AIPIM HIGIENIZADO',
      estimatedQuantity: 11880,
      hospitalQuantities: [],
    });
    expect(items[1].itemNumber).toBe(3);
  });

  it('entende aspas e quebra de linha no CSV', () => {
    const rows = parseCsv('descricao;unidade\n"ALHO\nHIGIENIZADO";KG\n');
    expect(rows[1][0]).toBe('ALHO\nHIGIENIZADO');
  });

  it('não confunde a coluna Item com a descrição', () => {
    const csv = ['ITEM;DESCRIÇÃO;UN;QUANTIDADE;MARCA', '7;BATATA INGLESA;KG;41400;Extra'].join('\n');
    const items = parseSpreadsheet(Buffer.from(csv, 'utf8'), 'edital.csv');
    expect(items[0]).toMatchObject({
      itemNumber: 7,
      description: 'BATATA INGLESA',
      estimatedQuantity: 41400,
      hospitalQuantities: [],
    });
  });

  it('junta as linhas repetidas do mesmo nº, uma por cooperativa', () => {
    const csv = [
      'Nº;Descrição;UN;Quantidade;Valor unitário',
      '1;AGAVE;KG;500;4,00',
      '1;AGAVE;KG;500;4,00',
      '2;BANANA;KG;200;1,50',
      '2;BANANA;KG;200;1,50',
    ].join('\n');
    const items = parseSpreadsheet(Buffer.from(csv, 'utf8'), 'termo.csv');
    expect(items.map((item) => [item.itemNumber, item.description, item.estimatedQuantity])).toEqual([
      [1, 'AGAVE', 500],
      [2, 'BANANA', 200],
    ]);
  });

  it('ignora a linha repetida do cabeçalho mesclado da planilha exportada', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Termo');
    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = 'ORGANIZAÇÃO COMERCIAL E LOGÍSTICA: REDECOOP';
    sheet.mergeCells('A5:A6');
    sheet.mergeCells('B5:B6');
    sheet.mergeCells('C5:C6');
    sheet.mergeCells('D5:D6');
    sheet.getCell('B5').value = 'DESCRIÇÃO DO ITEM';
    sheet.getCell('C5').value = 'UN';
    sheet.getCell('D5').value = 'Quantidade\nEstimada TOTAL';
    sheet.getCell('A7').value = 1;
    sheet.getCell('B7').value = 'BANANA';
    sheet.getCell('C7').value = 'KG';
    sheet.getCell('D7').value = 250;
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const items = await parseXlsx(buffer);
    expect(items).toEqual([
      expect.objectContaining({ itemNumber: 1, description: 'BANANA', unit: 'KG', estimatedQuantity: 250 }),
    ]);
  });

  it('lê a aba que tem a descrição e o cabeçalho em texto formatado', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('capa').addRow(['Capa do edital']);
    const sheet = workbook.addWorksheet('itens');
    sheet.getCell('A1').value = 'Nº';
    sheet.getCell('B1').value = { richText: [{ text: 'Descrição' }] };
    sheet.getCell('C1').value = 'Unidade';
    sheet.getCell('D1').value = 'Quantidade';
    sheet.addRow([1, 'ALHO', 'KG', 10]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const items = await parseXlsx(buffer);
    expect(items[0]).toMatchObject({ itemNumber: 1, description: 'ALHO', estimatedQuantity: 10 });
  });

  it('interpreta milhar com ponto e decimal com vírgula', () => {
    expect(parseLocaleNumber('20.700')).toBe(20700);
    expect(parseLocaleNumber('20.700,5')).toBe(20700.5);
    expect(parseLocaleNumber('12.50')).toBe(12.5);
  });
});
