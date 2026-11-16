import { fromMinor, toMinor } from './quantity';
import { divideQuantity } from './division';

describe('divideQuantity', () => {
  it('divide 900 kg em três cotas de 300', () => {
    const result = divideQuantity(900, [
      { id: 1, maxCapacity: null },
      { id: 2, maxCapacity: null },
      { id: 3, maxCapacity: null },
    ]);

    expect(result.allocations).toEqual([
      { id: 1, quantity: 300 },
      { id: 2, quantity: 300 },
      { id: 3, quantity: 300 },
    ]);
    expect(result.unallocated).toBe(0);
    expect(result.insufficientCapacity).toBe(false);
  });

  it('redistribui 900 kg quando X só pode 200: Y e Z ficam com 350', () => {
    const result = divideQuantity(900, [
      { id: 1, maxCapacity: 200 },
      { id: 2, maxCapacity: null },
      { id: 3, maxCapacity: null },
    ]);

    expect(result.allocations).toEqual([
      { id: 1, quantity: 200 },
      { id: 2, quantity: 350 },
      { id: 3, quantity: 350 },
    ]);
    expect(result.unallocated).toBe(0);
  });

  it('encadeia tetos: 200, 300 e o restante vai para quem ainda tem folga', () => {
    const result = divideQuantity(900, [
      { id: 1, maxCapacity: 200 },
      { id: 2, maxCapacity: 300 },
      { id: 3, maxCapacity: null },
    ]);

    expect(result.allocations.map((item) => item.quantity)).toEqual([200, 300, 400]);
    expect(result.unallocated).toBe(0);
  });

  it('arredonda milésimos e a soma fecha com o total', () => {
    const result = divideQuantity(100, [
      { id: 1, maxCapacity: null },
      { id: 2, maxCapacity: null },
      { id: 3, maxCapacity: null },
    ]);

    expect(result.allocations.map((item) => item.quantity)).toEqual([33.334, 33.333, 33.333]);
    const sum = result.allocations.reduce((total, item) => total + toMinor(item.quantity), 0);
    expect(sum).toBe(toMinor(100));
    expect(result.unallocated).toBe(0);
  });

  it('mantém a soma quando o teto corta o milésimo extra', () => {
    const result = divideQuantity(100, [
      { id: 1, maxCapacity: 33.333 },
      { id: 2, maxCapacity: null },
      { id: 3, maxCapacity: null },
    ]);

    const allocated = result.allocations.reduce((total, item) => total + toMinor(item.quantity), 0);
    expect(allocated + toMinor(result.unallocated)).toBe(toMinor(100));
    expect(result.allocations[0].quantity).toBe(33.333);
    expect(result.insufficientCapacity).toBe(false);
  });

  it('sinaliza saldo quando a capacidade somada não cobre o total', () => {
    const result = divideQuantity(900, [
      { id: 1, maxCapacity: 200 },
      { id: 2, maxCapacity: 200 },
      { id: 3, maxCapacity: 200 },
    ]);

    expect(result.allocations.map((item) => item.quantity)).toEqual([200, 200, 200]);
    expect(result.unallocated).toBe(300);
    expect(result.insufficientCapacity).toBe(true);
    expect(fromMinor(toMinor(result.unallocated) + 600000)).toBe(900);
  });

  it('entrega o total a uma única cooperativa sem teto', () => {
    const result = divideQuantity(900, [{ id: 7, maxCapacity: null }]);
    expect(result.allocations).toEqual([{ id: 7, quantity: 900 }]);
    expect(result.unallocated).toBe(0);
  });

  it('não aloca nada quando não há cooperativas', () => {
    const result = divideQuantity(900, []);
    expect(result.allocations).toEqual([]);
    expect(result.unallocated).toBe(900);
    expect(result.insufficientCapacity).toBe(true);
  });
});
