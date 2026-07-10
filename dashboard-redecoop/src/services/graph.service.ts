import { apiFetch } from '@/lib/api'
import type { GraphData } from '@/types'

/**
 * APIs de coluna devolvem `{ categories, data: number[] }`.
 * APIs de pizza devolvem `{ data: { name, y }[] }` (sem `categories`).
 * O interceptor da API envolve tudo em `{ statusCode, data: ... }`.
 */
function mapGraphResponse(response: unknown): GraphData {
  const r = response as { data?: unknown }
  const inner = r?.data !== undefined ? r.data : r

  if (!inner || typeof inner !== 'object') {
    return { categories: [], data: [] }
  }

  const o = inner as { categories?: unknown; data?: unknown }
  if (!Array.isArray(o.data)) {
    return { categories: [], data: [] }
  }

  return {
    categories: Array.isArray(o.categories) ? (o.categories as string[]) : [],
    data: o.data as GraphData['data'],
  }
}

export const graphService = {
  totalCooperativesByMunicipality() {
    return apiFetch<unknown>('/graph/total-cooperatives-by-municipality').then(mapGraphResponse)
  },

  totalVisitantsByMunicipality() {
    return apiFetch<unknown>('/graph/total-visitants-by-municipality').then(mapGraphResponse)
  },

  totalVisitantsByType() {
    return apiFetch<unknown>('/graph/total-visitants-by-type').then(mapGraphResponse)
  },

  totalProductCategories() {
    return apiFetch<unknown>('/graph/total-product-categories').then(mapGraphResponse)
  },
}
