import { apiFetch, apiFetchData, unwrapData } from '@/lib/api'
import { apiFetchPaginatedFull } from '@/lib/pagination'
import { objectToFormData } from '@/lib/formData'
import type { CatalogProduct, Conversation, Product } from '@/types'

export type ProductListFilters = {
  categoryId?: string
  typeId?: string
  name?: string
}

export type CategoryCount = { categoryId: number; categoryName: string; total: number }

export const productService = {
  listAdmin(page = 1, limit = 10, filters: ProductListFilters = {}) {
    return apiFetchPaginatedFull<Product>('/root/product/list', page, limit, {
      'filter.categoryId': filters.categoryId,
      'filter.typeId': filters.typeId,
      'filter.name': filters.name?.trim() || undefined,
    })
  },

  countByCategory(filters: Pick<ProductListFilters, 'typeId' | 'name'> = {}) {
    const params = new URLSearchParams()
    if (filters.typeId) params.set('filter.typeId', filters.typeId)
    if (filters.name?.trim()) params.set('filter.name', filters.name.trim())
    const q = params.toString()
    return apiFetchData<CategoryCount[]>(
      `/root/product/count-by-category${q ? `?${q}` : ''}`,
    )
  },

  getById(id: number) {
    return apiFetchData<Product>(`/root/product/show/${id}`)
  },

  create(form: Record<string, unknown>) {
    return apiFetch('/root/product/create', { method: 'POST', body: objectToFormData(form) })
  },

  update(id: number, form: Record<string, unknown>) {
    return apiFetch(`/root/product/update/${id}`, { method: 'PUT', body: objectToFormData(form) })
  },

  delete(id: number) {
    return apiFetch(`/root/product/${id}`, { method: 'DELETE' })
  },

  types() {
    return apiFetchData<{ id: number; name: string }[]>('/common/product-type/list')
  },

  categories() {
    return apiFetchData<{ id: number; name: string }[]>('/common/product-category/list')
  },

  listForCooperative() {
    return apiFetchData<Product[]>('/cooperative/product/list')
  },
}

export const catalogService = {
  list(page = 1, limit = 10, filters: ProductListFilters = {}) {
    return apiFetchPaginatedFull<CatalogProduct>('/cooperative/catalog/list', page, limit, {
      'filter.categoryId': filters.categoryId,
      'filter.typeId': filters.typeId,
      'filter.name': filters.name?.trim() || undefined,
    })
  },

  countByCategory(filters: Pick<ProductListFilters, 'typeId' | 'name'> = {}) {
    const params = new URLSearchParams()
    if (filters.typeId) params.set('filter.typeId', filters.typeId)
    if (filters.name?.trim()) params.set('filter.name', filters.name.trim())
    const q = params.toString()
    return apiFetchData<CategoryCount[]>(
      `/cooperative/catalog/count-by-category${q ? `?${q}` : ''}`,
    )
  },

  view(id: number) {
    return apiFetchData<CatalogProduct>(`/cooperative/catalog/view/${id}`)
  },

  create(data: Record<string, unknown>) {
    return apiFetch('/cooperative/catalog/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update(id: number, data: Record<string, unknown>) {
    return apiFetch(`/cooperative/catalog/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  remove(itemId: number) {
    return apiFetch(`/cooperative/catalog/remove-item/${itemId}`, { method: 'DELETE' })
  },

  uploadCustomImage(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    return apiFetchData<{ filename: string }>('/cooperative/catalog/custom-image', {
      method: 'POST',
      body: fd,
    })
  },

  packaging() {
    return apiFetchData<{ id: number; name: string }[]>('/common/packaging/list')
  },
}

export const conversationService = {
  list(page = 1, limit = 20, cooperativeId?: string) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (cooperativeId) params.set('filter.cooperativeId', cooperativeId)
    return apiFetch<unknown>(`/conversation/list?${params}`).then((response) => {
      const unwrapped = unwrapData<{
        data?: Conversation[]
        meta?: { totalItems?: number; currentPage?: number; totalPages?: number }
        totalUnreadMessages?: number
      }>(response)
      return {
        data: unwrapped.data ?? [],
        meta: unwrapped.meta ?? { currentPage: page, totalPages: 1, totalItems: 0 },
        totalUnreadMessages: unwrapped.totalUnreadMessages ?? 0,
      }
    })
  },

  view(conversationId: number) {
    return apiFetchData<Conversation>(`/conversation/view/${conversationId}`)
  },

  startDirect(data: { cooperativeId: number; message?: string }) {
    return apiFetchData<Conversation>('/conversation/start-direct', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  recentContacts() {
    return apiFetchData<Conversation[]>('/conversation/contacts-recent')
  },
}
