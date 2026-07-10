import { environment } from '@/config/environment'

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

function handleUnauthorized(path: string) {
  if (!getToken()) return
  // exchange-token pode ser chamado 2x no Strict Mode; não apagar sessão já criada
  if (path.includes('/auth/exchange-token')) return
  localStorage.removeItem('token')
  localStorage.removeItem('currentUser')
  window.dispatchEvent(new Event('auth:logout'))
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${environment.api}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    handleUnauthorized(path)
  }

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : `Erro ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export function unwrapData<T>(response: unknown): T {
  if (
    response !== null &&
    typeof response === 'object' &&
    'data' in response &&
    (response as { data: unknown }).data !== undefined
  ) {
    return (response as { data: T }).data
  }
  return response as T
}

export async function apiFetchData<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiFetch<unknown>(path, options)
  return unwrapData<T>(response)
}

export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${environment.api}${path}`, { ...options, headers })

  if (response.status === 401) {
    handleUnauthorized(path)
  }

  if (!response.ok) throw new ApiError(`Erro ${response.status}`, response.status)
  return response.blob()
}

interface PaginatedPayload<T> {
  data?: T[]
  meta?: {
    totalItems?: number
    totalPages?: number
    currentPage?: number
    itemsPerPage?: number
  }
  total?: number
}

export interface PaginationMeta {
  totalItems: number
  totalPages: number
  currentPage: number
  itemsPerPage: number
}

export async function apiFetchPaginated<T>(
  path: string,
  page = 1,
  limit = 10,
  extra: Record<string, string | number | undefined> = {},
): Promise<{ data: T[]; total: number; meta: PaginationMeta }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  Object.entries(extra).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v))
  })

  const response = await apiFetch<unknown>(`${path}?${params}`)
  const unwrapped = unwrapData<PaginatedPayload<T> | T[]>(response)

  if (Array.isArray(unwrapped)) {
    const totalItems = unwrapped.length
    return {
      data: unwrapped,
      total: totalItems,
      meta: {
        totalItems,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: limit,
      },
    }
  }

  const totalItems =
    unwrapped.meta?.totalItems ??
    unwrapped.total ??
    unwrapped.data?.length ??
    0

  return {
    data: unwrapped.data ?? [],
    total: totalItems,
    meta: {
      totalItems,
      totalPages: unwrapped.meta?.totalPages ?? 1,
      currentPage: unwrapped.meta?.currentPage ?? page,
      itemsPerPage: unwrapped.meta?.itemsPerPage ?? limit,
    },
  }
}
