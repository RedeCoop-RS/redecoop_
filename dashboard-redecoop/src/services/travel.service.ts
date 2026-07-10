import { apiFetch, apiFetchData } from '@/lib/api'
import { apiFetchPaginatedFull } from '@/lib/pagination'
import type { Travel, TravelOffer } from '@/types'

export type TravelListFilters = {
  startDateTime?: string
  vehicleTypeId?: string
  notfinished?: boolean
  type?: 'offerer' | 'participant' | ''
  status?: 'completed' | 'awaiting' | ''
}

export const travelService = {
  list(page = 1, limit = 10) {
    return apiFetchPaginatedFull<Travel>('/travel/list/', page, limit)
  },

  available(page = 1, limit = 10, filters: Pick<TravelListFilters, 'startDateTime' | 'vehicleTypeId' | 'status'> = {}) {
    return apiFetchPaginatedFull<Travel>('/travel/available-travels', page, limit, {
      'filter.startDateTime': filters.startDateTime,
      'filter.vehicleTypeId': filters.vehicleTypeId,
      'filter.status': filters.status || undefined,
    })
  },

  myTravels(page = 1, limit = 10, filters: TravelListFilters = {}) {
    return apiFetchPaginatedFull<Travel>('/travel/my-travels/', page, limit, {
      'filter.startDateTime': filters.startDateTime,
      'filter.notfinished': filters.notfinished ? 'true' : undefined,
      'filter.type': filters.type || undefined,
      'filter.status': filters.status || undefined,
    }).then((result) => ({
      ...result,
      openCount: Number(result.raw.openCount ?? 0),
      completedCount: Number(result.raw.completedCount ?? 0),
    }))
  },

  view(id: number) {
    return apiFetchData<Travel>(`/travel/view/${id}`)
  },

  create(data: Record<string, unknown>) {
    return apiFetch('/travel/create', { method: 'POST', body: JSON.stringify(data) })
  },

  update(id: number, data: Record<string, unknown>) {
    return apiFetch(`/travel/${id}/update`, { method: 'PATCH', body: JSON.stringify(data) })
  },

  delete(id: number) {
    return apiFetch(`/travel/${id}`, { method: 'DELETE' })
  },

  finalize(id: number, data: { completedAt: string }) {
    return apiFetch(`/travel/${id}/finalize`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  getWithOffers(id: number) {
    return apiFetchData<Travel & { offers?: TravelOffer[] }>(`/travel/${id}/offers-travel`)
  },

  getRoutesWithProposal(travelId: number) {
    return apiFetchData<import('@/types').TravelRoute[]>(
      `/travel/final-routes-with-proposal/${travelId}`,
    )
  },

  adjustRouteOrder(travelId: number, routes: import('@/types').TravelRoute[]) {
    return apiFetch(`/travel/adjust-route-order/${travelId}`, {
      method: 'PUT',
      body: JSON.stringify(routes),
    })
  },

  attachFileInRoute(routeId: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    return apiFetchData<{ file: string }>(`/travel/attach-file-route/${routeId}`, {
      method: 'POST',
      body: form,
    })
  },
}

export const travelOfferService = {
  view(id: number) {
    return apiFetchData<TravelOffer>(`/common/travel-offer/view/${id}`)
  },

  create(data: Record<string, unknown>) {
    return apiFetch('/cooperative/travel-offer/create-offer', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(id: number, data: Record<string, unknown>) {
    return apiFetch(`/common/travel-offer/${id}/update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  approve(id: number, approved: boolean) {
    return apiFetch(`/cooperative/travel-offer/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approved }),
    })
  },

  estimatePrice(data: Record<string, unknown>) {
    return apiFetchData<{ price: number }>('/common/travel-offer/estimate-offer-price', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
