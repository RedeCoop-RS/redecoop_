export const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  },
};
