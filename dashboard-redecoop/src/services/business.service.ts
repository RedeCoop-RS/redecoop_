import { apiFetch, apiFetchData, unwrapData } from '@/lib/api'
import { apiFetchPaginatedFull } from '@/lib/pagination'
import type { Business, BusinessDeskItem, CollectivePurchase } from '@/types'

export type OpportunityListFilters = {
  createdAtBetween?: string
  showInactive?: boolean
}

export type BusinessListFilters = {
  status?: string
  createdAtBetween?: string
  awaitingMediation?: boolean
  type?: string
  operation?: string
}

export type BusinessListResult = {
  data: Business[]
  total: number
  negotiatingCount: number
}

async function fetchBusinessList(
  path: string,
  page: number,
  limit: number,
  filters: BusinessListFilters,
): Promise<BusinessListResult> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (filters.status) params.set('filter.status', filters.status)
  if (filters.createdAtBetween) params.set('filter.createdAt', filters.createdAtBetween)
  if (filters.awaitingMediation) params.set('filter.awaitingMediation', 'true')
  if (filters.type) params.set('filter.type', filters.type)
  if (filters.operation) params.set('filter.operation', filters.operation)

  const response = await apiFetch<unknown>(`${path}?${params}`)
  const unwrapped = unwrapData<{
    data?: Business[]
    meta?: { totalItems?: number }
    negotiatingCount?: number
  }>(response)

  return {
    data: unwrapped.data ?? [],
    total: unwrapped.meta?.totalItems ?? unwrapped.data?.length ?? 0,
    negotiatingCount: unwrapped.negotiatingCount ?? 0,
  }
}

export const businessService = {
  listAdmin(page = 1, limit = 12, filters: BusinessListFilters = {}) {
    return fetchBusinessList('/business/list-all', page, limit, filters)
  },

  listCooperative(page = 1, limit = 12, filters: BusinessListFilters = {}) {
    return fetchBusinessList('/business/list', page, limit, filters)
  },

  read(id: number) {
    return apiFetchData<Business>(`/business/${id}`)
  },

  updateValue(id: number, value: number) {
    return apiFetch(`/business/${id}/update-value`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    })
  },

  markAsDone(id: number) {
    return apiFetch(`/business/${id}/mark-as-done`, { method: 'PATCH' })
  },
}

export const businessDeskService = {
  list(page = 1, limit = 10, filters: OpportunityListFilters = {}) {
    return apiFetchPaginatedFull<BusinessDeskItem>('/common/business-desk/list', page, limit, {
      'filter.createdAt': filters.createdAtBetween,
      'filter.showInactive': filters.showInactive ? 'true' : undefined,
    })
  },

  view(id: number) {
    return apiFetchData<BusinessDeskItem>(`/common/business-desk/view/${id}`)
  },

  create(data: Record<string, unknown>) {
    return apiFetch('/cooperative/business-desk/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(id: number, data: Record<string, unknown>) {
    return apiFetch(`/common/business-desk/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  startContact(data: { businessDeskId: number; initialMessage: string }) {
    return apiFetch('/cooperative/business-desk/start-contact', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  changeStatus(id: number, active: boolean) {
    return apiFetch(`/common/business-desk/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },

  softDelete(id: number) {
    return apiFetch(`/root/business-desk/${id}/soft-delete`, { method: 'PATCH' })
  },
}

export const collectivePurchaseService = {
  list(page = 1, limit = 10, filters: OpportunityListFilters = {}) {
    return apiFetchPaginatedFull<CollectivePurchase>('/collective-purchase/list', page, limit, {
      'filter.createdAt': filters.createdAtBetween,
      'filter.showInactive': filters.showInactive ? 'true' : undefined,
    })
  },

  view(id: number) {
    return apiFetchData<CollectivePurchase>(`/collective-purchase/${id}/view`)
  },

  create(data: Record<string, unknown>) {
    return apiFetch('/collective-purchase/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(id: number, data: Record<string, unknown>) {
    return apiFetch(`/collective-purchase/${id}/update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  startTrading(id: number, data: { initialMessage: string }) {
    return apiFetch(`/collective-purchase/${id}/start-trading`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  changeStatus(id: number, active: boolean) {
    return apiFetch(`/collective-purchase/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },
}
