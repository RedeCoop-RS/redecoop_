import type { CatalogListMeta, PublicCatalogProduct } from '@/types'
import { unwrapData } from '@/lib/api'

export function normalizeCatalogProduct(row: PublicCatalogProduct | Record<string, unknown>): PublicCatalogProduct {
  const raw = row as Record<string, unknown>

  let seasonalities = raw.seasonalities ?? raw.catalogSeasonalities ?? []
  if (!Array.isArray(seasonalities) && seasonalities && typeof seasonalities === 'object') {
    seasonalities = Object.values(seasonalities)
  }

  const toNum = (v: unknown) => {
    if (v == null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    ...(row as PublicCatalogProduct),
    seasonalities: (seasonalities as PublicCatalogProduct['seasonalities']) ?? [],
    highEstimate: toNum(raw.highEstimate ?? raw.high_estimate),
    mediumEstimate: toNum(raw.mediumEstimate ?? raw.medium_estimate),
    lowEstimate: toNum(raw.lowEstimate ?? raw.low_estimate),
    hasSeasonality: Boolean(raw.hasSeasonality ?? raw.has_seasonality),
  }
}

export function parseCatalogProductsResponse(response: unknown): {
  data: PublicCatalogProduct[]
  meta: CatalogListMeta
} {
  let body: unknown = unwrapData(response)

  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'data' in body &&
    Array.isArray((body as { data: unknown }).data)
  ) {
    const envelope = body as { data: unknown[]; meta?: CatalogListMeta }
    return {
      data: envelope.data.map((row) => normalizeCatalogProduct(row as PublicCatalogProduct)),
      meta: { totalPages: envelope.meta?.totalPages ?? 1, ...envelope.meta },
    }
  }

  if (Array.isArray(body)) {
    return {
      data: body.map((row) => normalizeCatalogProduct(row as PublicCatalogProduct)),
      meta: { totalPages: 1 },
    }
  }

  return { data: [], meta: { totalPages: 1 } }
}

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function seasonalityPt(level: string): string {
  switch (level) {
    case 'HIGH':
      return 'Alta'
    case 'MEDIUM':
      return 'Média'
    case 'LOW':
      return 'Baixa'
    default:
      return 'Nenhuma'
  }
}

export function formatSeasonalitySummary(item: PublicCatalogProduct): string {
  const rows = item.seasonalities ?? []
  const byLevel = new Map<string, number[]>()

  for (const s of rows) {
    if (!s.seasonality || s.seasonality === 'NONE') continue
    const arr = byLevel.get(s.seasonality) ?? []
    arr.push(s.month)
    byLevel.set(s.seasonality, arr)
  }

  if (byLevel.size === 0) return ''

  const order = ['HIGH', 'MEDIUM', 'LOW']
  const parts: string[] = []

  for (const lvl of order) {
    const months = byLevel.get(lvl)
    if (!months?.length) continue
    const sorted = [...months].sort((a, b) => a - b)
    const labels = sorted
      .map((m) => (m >= 1 && m <= 12 ? MONTHS_PT[m - 1] : `m${m}`))
      .join(', ')
    parts.push(`${seasonalityPt(lvl)}: ${labels}`)
  }

  return parts.join(' · ')
}

export function formatCapacitySummary(item: PublicCatalogProduct): string {
  const parts: string[] = []
  const pushNum = (label: string, v: number | undefined | null) => {
    if (v == null) return
    const n = Number(v)
    if (!Number.isFinite(n)) return
    parts.push(`${label} ${n}`)
  }

  pushNum('Alta', item.highEstimate)
  pushNum('Média', item.mediumEstimate)
  pushNum('Baixa', item.lowEstimate)

  return parts.join(' · ')
}

export function hasSeasonalityDisplay(item: PublicCatalogProduct): boolean {
  return formatSeasonalitySummary(item).length > 0
}

export function hasCapacityDisplay(item: PublicCatalogProduct): boolean {
  return formatCapacitySummary(item).length > 0
}
