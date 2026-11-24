import { buildCalendarAlerts, describeMonths, splitQuotaByMonths } from './calendar';
import { toMinor } from './quantity';

describe('splitQuotaByMonths', () => {
  it('divide a cota em partes iguais entre os meses marcados', () => {
    const shares = splitQuotaByMonths(350, [1, 3, 5, 7, 9]);
    expect(shares).toHaveLength(5);
    const sum = shares.reduce((total, share) => total + toMinor(share.quantity), 0);
    expect(sum).toBe(toMinor(350));
    expect(shares.every((share) => share.quantity === 70)).toBe(true);
  });

  it('distribui o resto para a soma dos meses fechar com a cota', () => {
    const shares = splitQuotaByMonths(100, [1, 2, 3]);
    expect(shares.map((share) => share.quantity)).toEqual([33.334, 33.333, 33.333]);
    const sum = shares.reduce((total, share) => total + toMinor(share.quantity), 0);
    expect(sum).toBe(toMinor(100));
  });

  it('não gera meses quando a cooperativa não marcou sazonalidade', () => {
    expect(splitQuotaByMonths(200, [])).toEqual([]);
  });
});

describe('describeMonths', () => {
  it('junta sequências de três ou mais meses em faixa', () => {
    expect(describeMonths([4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('ABR a DEZ');
    expect(describeMonths([1, 3, 4, 5, 6, 9])).toBe('JAN, MAR a JUN e SET');
    expect(describeMonths([1, 2])).toBe('JAN e FEV');
    expect(describeMonths([7])).toBe('JUL');
  });
});

describe('buildCalendarAlerts', () => {
  const item = {
    id: 4,
    description: 'ALHO',
    estimatedQuantity: 900,
    allocations: [
      { cooperativeId: 1, cooperativeName: 'X', quantity: 200, months: [1, 2] },
      { cooperativeId: 2, cooperativeName: 'Y', quantity: 350, months: [1] },
      { cooperativeId: 3, cooperativeName: 'Z', quantity: 350, months: [] },
    ],
  };

  it('alerta mês sem fornecedor e cota sem mês marcado', () => {
    const alerts = buildCalendarAlerts([item]);
    const months = alerts.filter((alert) => alert.code === 'MONTH_WITHOUT_SUPPLIER');
    expect(months).toHaveLength(1);
    expect(months[0].months).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(months[0].message).toBe('ALHO: sem fornecedor em MAR a DEZ (10 meses).');
    expect(
      alerts.some((alert) => alert.code === 'QUOTA_WITHOUT_MONTHS' && alert.cooperativeId === 3),
    ).toBe(true);
    expect(alerts.some((alert) => alert.code === 'ALLOCATION_SHORTFALL')).toBe(false);
  });

  it('aponta meses com mais de uma cooperativa no mesmo item', () => {
    const alerts = buildCalendarAlerts([item]);
    const overlap = alerts.filter((alert) => alert.code === 'MONTH_OVERLAP');
    expect(overlap).toHaveLength(1);
    expect(overlap[0].months).toEqual([1]);
    expect(overlap[0].message).toBe('ALHO: mais de uma cooperativa entrega em JAN.');
  });

  it('não aponta nada quando as cooperativas se revezam no ano todo', () => {
    const alerts = buildCalendarAlerts([
      {
        ...item,
        allocations: [
          { cooperativeId: 1, cooperativeName: 'CAAF', quantity: 300, months: [1, 2, 7, 8] },
          { cooperativeId: 2, cooperativeName: 'COOMAFITT', quantity: 300, months: [5, 6, 11, 12] },
          { cooperativeId: 3, cooperativeName: 'NOSSA TERRA', quantity: 300, months: [3, 4, 9, 10] },
        ],
      },
    ]);
    expect(alerts).toEqual([]);
  });

  it('usa um único alerta quando nenhum mês tem fornecedor', () => {
    const alerts = buildCalendarAlerts([
      {
        ...item,
        allocations: [{ cooperativeId: 1, cooperativeName: 'X', quantity: 900, months: [] }],
      },
    ]);
    const months = alerts.filter((alert) => alert.code === 'MONTH_WITHOUT_SUPPLIER');
    expect(months).toHaveLength(1);
    expect(months[0].message).toBe('ALHO: nenhum mês tem fornecedor marcado.');
  });

  it('alerta quando a soma das cotas não fecha com o total', () => {
    const alerts = buildCalendarAlerts([
      {
        ...item,
        allocations: [{ cooperativeId: 1, cooperativeName: 'X', quantity: 200, months: [1] }],
      },
    ]);
    expect(alerts.some((alert) => alert.code === 'ALLOCATION_SHORTFALL')).toBe(true);
  });
});
