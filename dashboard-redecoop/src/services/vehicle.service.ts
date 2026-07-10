import { apiFetch, apiFetchData, apiFetchPaginated } from '@/lib/api'
import { objectToFormData } from '@/lib/formData'
import type { Vehicle } from '@/types'

export const vehicleService = {
  list(page = 1, limit = 10, cooperativeId?: number) {
    return apiFetchPaginated<Vehicle>('/vehicle/list', page, limit, {
      'filter.cooperativeId': cooperativeId,
    })
  },

  view(id: number) {
    return apiFetchData<Vehicle>(`/vehicle/view/${id}`)
  },

  create(form: Record<string, unknown>) {
    return apiFetch('/vehicle/create', { method: 'POST', body: objectToFormData(form) })
  },

  update(id: number, form: Record<string, unknown>) {
    return apiFetch(`/vehicle/update/${id}`, { method: 'PUT', body: objectToFormData(form) })
  },

  changeStatus(id: number, active: boolean) {
    return apiFetch(`/vehicle/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },

  select(cooperativeId?: number) {
    const q = cooperativeId ? `?filter.cooperativeId=${cooperativeId}` : ''
    return apiFetchData<
      {
        id: number
        name?: string
        model?: string
        licensePlate?: string
        maximumWeight?: number
        volume?: number
      }[]
    >(`/vehicle/select${q}`)
  },

  types() {
    return apiFetchData<{ id: number; name: string }[]>('/common/vehicle-type/list')
  },
}
