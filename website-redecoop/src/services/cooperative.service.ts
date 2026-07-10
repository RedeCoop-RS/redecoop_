import { parseCatalogProductsResponse } from '@/lib/catalog-format'
import { apiFetch, apiFetchData } from '@/lib/api'
import type {
  CatalogListMeta,
  Cooperative,
  CooperativeSummary,
  PublicCatalogProduct,
} from '@/types'

let cooperativesCache: CooperativeSummary[] | null = null

export const cooperativeService = {
  async getCooperatives(): Promise<CooperativeSummary[]> {
    if (cooperativesCache) return cooperativesCache
    const data = await apiFetchData<CooperativeSummary[]>('/public/cooperative/list')
    cooperativesCache = Array.isArray(data) ? data : []
    return cooperativesCache
  },

  async getCooperative(id: number): Promise<Cooperative> {
    return apiFetchData<Cooperative>(`/public/cooperative/${id}/view`)
  },

  async listCatalogProducts(params: {
    cooperativeId?: number | null
    page?: number
    limit?: number
    typeId?: number | null
    categoryId?: number | null
  }): Promise<{ data: PublicCatalogProduct[]; meta: CatalogListMeta }> {
    const qs = new URLSearchParams()
    if (params.cooperativeId) qs.set('cooperativeId', String(params.cooperativeId))
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.typeId) qs.set('filter.typeId', String(params.typeId))
    if (params.categoryId) qs.set('filter.categoryId', String(params.categoryId))

    const response = await apiFetch<unknown>(`/public/cooperative/catalog-products?${qs}`)
    const parsed = parseCatalogProductsResponse(response)

    return {
      data: parsed.data,
      meta: {
        ...parsed.meta,
        totalPages: parsed.meta.totalPages ?? 1,
      },
    }
  },

  async verifyToken(token: string): Promise<Cooperative> {
    return apiFetchData<Cooperative>(`/cooperative/check-token-signup/${token}`)
  },

  async completeRegistration(token: string, formData: FormData) {
    return apiFetch(`/cooperative/complete-registration/${token}`, {
      method: 'PUT',
      body: formData,
    })
  },
}
