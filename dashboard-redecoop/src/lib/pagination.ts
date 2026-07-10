import { apiFetch, unwrapData } from '@/lib/api'

export type PageMeta = {
  currentPage?: number
  totalPages?: number
  totalItems?: number
}

type PaginatedResponse<T> = {
  data?: T[]
  meta?: PageMeta
  totalItems?: number
  [key: string]: unknown
}

export async function apiFetchPaginatedFull<T>(
  path: string,
  page = 1,
  limit = 10,
  filters: Record<string, string | number | boolean | undefined> = {},
): Promise<{ data: T[]; meta: PageMeta; raw: PaginatedResponse<T> }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })

  const response = await apiFetch<unknown>(`${path}?${params}`)
  const unwrapped = unwrapData<PaginatedResponse<T> | T[]>(response)

  if (Array.isArray(unwrapped)) {
    return {
      data: unwrapped,
      meta: { currentPage: page, totalPages: 1, totalItems: unwrapped.length },
      raw: { data: unwrapped },
    }
  }

  const data = unwrapped.data ?? []
  const meta: PageMeta = unwrapped.meta ?? {
    currentPage: page,
    totalPages: 1,
    totalItems: unwrapped.totalItems ?? data.length,
  }

  return { data, meta, raw: unwrapped }
}

export function hasNextPage(meta?: PageMeta) {
  if (!meta?.currentPage || !meta?.totalPages) return false
  return meta.currentPage < meta.totalPages
}

export function nextPage(meta?: PageMeta) {
  if (!hasNextPage(meta) || !meta?.currentPage) return null
  return meta.currentPage + 1
}
