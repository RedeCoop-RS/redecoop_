import { apiFetch, unwrapData } from '@/lib/api'
import type { AuthResponse, User } from '@/types'

const exchangePromises = new Map<string, Promise<AuthResponse>>()

export const authService = {
  getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('currentUser')
      if (!raw || raw === 'undefined') return null
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  },

  getToken(): string | null {
    try {
      return localStorage.getItem('token')
    } catch {
      return null
    }
  },

  setSession(token: string, user: User) {
    localStorage.setItem('token', token)
    localStorage.setItem('currentUser', JSON.stringify(user))
    window.dispatchEvent(new Event('auth:login'))
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    window.dispatchEvent(new Event('auth:logout'))
  },

  async authenticate(token: string): Promise<AuthResponse> {
    let pending = exchangePromises.get(token)
    if (!pending) {
      pending = (async () => {
        const response = await apiFetch<{ data: AuthResponse }>('/auth/exchange-token', {
          method: 'POST',
          body: JSON.stringify({ token }),
        })
        const data = unwrapData<AuthResponse>(response)
        this.setSession(data.token, data.user)
        return data
      })()
      exchangePromises.set(token, pending)
      pending.finally(() => exchangePromises.delete(token))
    }
    return pending
  },

  async login(credentials: { username: string; password: string }) {
    const response = await apiFetch<{ result: { token: string; user: User } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    this.setSession(response.result.token, response.result.user)
    return response
  },
}
