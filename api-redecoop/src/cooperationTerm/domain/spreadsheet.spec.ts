import { parseCsv, parseLocaleNumber, parseSpreadsheet } from './spreadsheet';

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

  it('entende aspas e quebra de linha no CSV', () => {
    const rows = parseCsv('descricao;unidade\n"ALHO\nHIGIENIZADO";KG\n');
    expect(rows[1][0]).toBe('ALHO\nHIGIENIZADO');
  });

  it('interpreta milhar com ponto e decimal com vírgula', () => {
    expect(parseLocaleNumber('20.700')).toBe(20700);
    expect(parseLocaleNumber('20.700,5')).toBe(20700.5);
    expect(parseLocaleNumber('12.50')).toBe(12.5);
  });
});
