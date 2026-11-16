/** Três casas decimais, em inteiros, para a soma das cotas fechar com o total. */
export const QUANTITY_SCALE = 1000;

export function toMinor(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * QUANTITY_SCALE);
}

export function fromMinor(minor: number): number {
  return minor / QUANTITY_SCALE;
}

export function asNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatQty(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
}
