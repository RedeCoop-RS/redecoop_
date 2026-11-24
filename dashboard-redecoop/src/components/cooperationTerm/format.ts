import type { CooperationTermModel, CooperationTermStatus } from '@/types/cooperationTerm'

export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value)
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function parseQty(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function modelLabel(model: CooperationTermModel): string {
  return model === 'GHC' ? 'Modelo GHC' : 'Modelo padrão'
}

export function statusLabel(status: CooperationTermStatus): string {
  return status === 'SIGNED' ? 'Firmado' : 'Rascunho'
}

export function splitEven(total: number, parts: number): number[] {
  if (parts <= 0 || total <= 0) return []
  const scale = 1000
  const minor = Math.round(total * scale)
  const base = Math.floor(minor / parts)
  const extra = minor % parts
  const shares: number[] = []
  for (let index = 0; index < parts; index += 1) {
    shares.push((base + (index < extra ? 1 : 0)) / scale)
  }
  return shares
}

/**
 * Rodízio sugerido para o calendário, no padrão dos termos firmados: cada mês com uma cooperativa
 * e os meses divididos por igual. Com 2, 3 ou 6 cooperativas o revezamento é de dois em dois meses;
 * nos demais casos, mês a mês.
 */
export function suggestRotation(cooperatives: number): number[][] {
  if (cooperatives <= 0) return []
  const result: number[][] = Array.from({ length: cooperatives }, () => [])
  const block = 6 % cooperatives === 0 ? 2 : 1
  for (let month = 1; month <= 12; month++) {
    const slot = Math.floor((month - 1) / block) % cooperatives
    result[slot].push(month)
  }
  return result
}

export function sumsMatch(total: number, parts: number[]): boolean {
  const scale = 1000
  const expected = Math.round(total * scale)
  const actual = parts.reduce((sum, part) => sum + Math.round(part * scale), 0)
  return expected === actual
}
