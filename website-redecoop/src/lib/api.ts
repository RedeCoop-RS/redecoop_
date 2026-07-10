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
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    window.dispatchEvent(new Event('auth:logout'))
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

/** A API RedeCoop costuma envelopar respostas em `{ data: ... }`. */
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
