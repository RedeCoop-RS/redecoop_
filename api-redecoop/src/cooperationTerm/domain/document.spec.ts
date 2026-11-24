import { CooperationTerm } from '../entities/cooperationTerm.entity';
import { buildDocumentLines, itemsWithoutCooperatives } from './document';

function term(): CooperationTerm {
  const item = (id: number, itemNumber: number, description: string, coops: [number, string, number, number[]][]) => ({
    id,
    position: id,
    itemNumber,
    description,
    unit: 'KG',
    estimatedQuantity: coops.reduce((sum, coop) => sum + coop[2], 0) || 100,
    unitPrice: null,
    totalPrice: null,
    allocations: coops.map(([cooperativeId, name, quantity]) => ({
      cooperativeId,
      quantity,
      cooperative: { fantasyName: name },
    })),
    supplyMonths: coops.map(([cooperativeId, , , months]) => ({ cooperativeId, months })),
  });
  return {
    name: 'Edital GHC',
    processNumber: '1809/26',
    items: [
      item(1, 7, 'BATATA INGLESA', [[1, 'CAAF', 20700, [2, 4]], [2, 'NOSSA TERRA', 20700, [1, 3]]]),
      item(2, 8, 'BERINJELA', []),
      item(3, 9, 'BETERRABA', [[1, 'CAAF', 6400, [9, 10, 11, 12]]]),
    ],
  } as unknown as CooperationTerm;
}

describe('buildDocumentLines', () => {
  it('mantém a numeração do edital e deixa de fora itens sem cooperativa', () => {
    const lines = buildDocumentLines(term());
    expect(lines.map((line) => line.itemNumber)).toEqual([7, 7, 9]);
    expect(lines.map((line) => line.cooperative)).toEqual(['CAAF', 'NOSSA TERRA', 'CAAF']);
    expect(lines[0]).toMatchObject({ firstOfItem: true, rowSpan: 2, estimatedQuantity: 41400 });
    expect(lines[1]).toMatchObject({ firstOfItem: false, estimatedQuantity: null });
    expect(lines[2].months.slice(8)).toEqual([true, true, true, true]);
  });

  it('lista os itens sem cooperativa interessada', () => {
    expect(itemsWithoutCooperatives(term())).toEqual([{ itemNumber: 8, description: 'BERINJELA' }]);
  });
});
