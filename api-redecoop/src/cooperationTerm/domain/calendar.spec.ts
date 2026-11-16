import { buildCalendarAlerts, splitQuotaByMonths } from './calendar';
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
    expect(
      alerts.some((alert) => alert.code === 'MONTH_WITHOUT_SUPPLIER' && alert.month === 3),
    ).toBe(true);
    expect(
      alerts.some((alert) => alert.code === 'MONTH_WITHOUT_SUPPLIER' && alert.month === 1),
    ).toBe(false);
    expect(
      alerts.some((alert) => alert.code === 'QUOTA_WITHOUT_MONTHS' && alert.cooperativeId === 3),
    ).toBe(true);
    expect(alerts.some((alert) => alert.code === 'ALLOCATION_SHORTFALL')).toBe(false);
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
