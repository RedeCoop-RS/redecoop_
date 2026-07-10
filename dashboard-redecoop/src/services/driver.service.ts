import { apiFetch, apiFetchData, apiFetchPaginated } from '@/lib/api'
import { objectToFormData } from '@/lib/formData'
import type { Driver } from '@/types'

export const driverService = {
  list(page = 1, limit = 10, cooperativeId?: number) {
    return apiFetchPaginated<Driver>('/driver/list', page, limit, {
      'filter.cooperativeId': cooperativeId,
    })
  },

  view(id: number) {
    return apiFetchData<Driver>(`/driver/view/${id}`)
  },

  create(form: Record<string, unknown>) {
    return apiFetch('/driver/create', { method: 'POST', body: objectToFormData(form) })
  },

  update(id: number, form: Record<string, unknown>) {
    return apiFetch(`/driver/update/${id}`, { method: 'PUT', body: objectToFormData(form) })
  },

  changeStatus(id: number, active: boolean) {
    return apiFetch(`/driver/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },

  select(cooperativeId?: number) {
    const q = cooperativeId ? `?filter.cooperativeId=${cooperativeId}` : ''
    return apiFetchData<{ id: number; name: string }[]>(`/driver/select${q}`)
  },

  categoriesCnh() {
    return apiFetchData<string[]>('/driver/categories-cnh')
  },

  typesBlood() {
    return apiFetchData<string[]>('/driver/types-blood')
  },
}
