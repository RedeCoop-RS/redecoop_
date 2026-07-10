import { apiFetch, apiFetchData, apiFetchPaginated, unwrapData } from '@/lib/api'
import { objectToFormData } from '@/lib/formData'
import type { Cooperative } from '@/types'

export type CooperativeListResult = {
  data: Cooperative[]
  total: number
  totalDebits: number
}

export type CooperativeSelect = {
  id: number
  fantasyName?: string
  companyName?: string
  name?: string
}

export function cooperativeLabel(c: CooperativeSelect): string {
  return (c.fantasyName ?? c.companyName ?? c.name ?? '').trim() || `Cooperativa #${c.id}`
}

export const cooperativeService = {
  async list(page = 1, limit = 10): Promise<CooperativeListResult> {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    const response = await apiFetch<unknown>(`/cooperative/list?${params}`)
    const unwrapped = unwrapData<{
      data?: Cooperative[]
      meta?: { totalItems?: number }
      totalDebits?: number | string
    }>(response)

    const totalDebitsRaw = unwrapped.totalDebits
    const totalDebits =
      typeof totalDebitsRaw === 'number'
        ? totalDebitsRaw
        : Number(totalDebitsRaw) || 0

    return {
      data: unwrapped.data ?? [],
      total: unwrapped.meta?.totalItems ?? unwrapped.data?.length ?? 0,
      totalDebits,
    }
  },

  listPaginated(page = 1, limit = 10) {
    return apiFetchPaginated<Cooperative>('/cooperative/list', page, limit)
  },

  select() {
    return apiFetchData<CooperativeSelect[]>('/cooperative/select')
  },

  view(id: number) {
    return apiFetchData<Cooperative>(`/cooperative/view/${id}`)
  },

  viewSummary(id: number) {
    return apiFetchData<Cooperative>(`/cooperative/${id}/view-summary`)
  },

  viewProfile() {
    return apiFetchData<Cooperative>('/cooperative/view-profile')
  },

  create(form: Record<string, unknown>) {
    return apiFetch('/cooperative/create', {
      method: 'POST',
      body: objectToFormData(form),
    })
  },

  update(id: number, form: Record<string, unknown>) {
    return apiFetch(`/cooperative/update/${id}`, {
      method: 'PUT',
      body: objectToFormData(form),
    })
  },

  updateProfile(form: Record<string, unknown>) {
    return apiFetch('/cooperative/update-profile', {
      method: 'PUT',
      body: objectToFormData(form),
    })
  },

  updateEmail(data: { email: string; repeatEmail: string; password: string }) {
    return apiFetch('/cooperative/update-email', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  updatePassword(data: { newPassword: string; repeatNewPassword: string; password: string }) {
    return apiFetch('/cooperative/update-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  changeStatus(id: number, active: boolean) {
    return apiFetch(`/cooperative/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },

  changePassword(cooperativeId: number, password: string) {
    return apiFetch(`/cooperative/${cooperativeId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },

  selectProducts(cooperativeId: number) {
    return apiFetchData<{ id: number; name: string }[]>(
      `/cooperative/${cooperativeId}/select-products`,
    )
  },
}
