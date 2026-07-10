import { apiFetch, apiFetchData, ApiError } from '@/lib/api'
import { environment } from '@/config/environment'
import type { Cooperative, LoginResponse, RegisterVisitant, UserData } from '@/types'

function isJwtExpired(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const payload = JSON.parse(atob(parts[1])) as { exp?: number }
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return false
  }
}

/** Sessão válida no site público: apenas consumidor (VISITANT) com perfil e token JWT ativo. */
function isValidWebsiteSession(user: unknown, token: string): user is UserData {
  if (!user || typeof user !== 'object') return false

  const u = user as UserData
  if (u.role !== 'VISITANT') return false
  if (!u.visitant?.name && !u.visitant?.email) return false
  if (isJwtExpired(token)) return false

  return true
}

export const authService = {
  getStoredUser(): UserData | null {
    try {
      const token = localStorage.getItem('token')
      const raw = localStorage.getItem('currentUser')

      if (!token || !raw || raw === 'undefined') {
        if (token || raw) this.clearSession()
        return null
      }

      const user = JSON.parse(raw) as unknown
      if (!isValidWebsiteSession(user, token)) {
        this.clearSession()
        return null
      }

      return user
    } catch {
      this.clearSession()
      return null
    }
  },

  isAuthenticated(): boolean {
    return this.getStoredUser() !== null
  },

  clearSession() {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
  },

  getToken(): string | null {
    try {
      return localStorage.getItem('token')
    } catch {
      return null
    }
  },

  setSession(token: string, user: UserData) {
    localStorage.setItem('token', token)
    localStorage.setItem('currentUser', JSON.stringify(user))
    window.dispatchEvent(new Event('auth:login'))
  },

  logout() {
    this.clearSession()
    window.dispatchEvent(new Event('auth:logout'))
  },

  async login(credentials: { username: string; password: string }) {
    const response = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    const payload = response.data

    if (payload.role === 'ADMIN' || payload.role === 'COOPERATIVE') {
      return response
    }

    const userData: UserData = payload.userData ?? {
      role: payload.role as UserData['role'],
      visitant: (payload as unknown as UserData).visitant,
      cooperative: (payload as unknown as UserData).cooperative,
    }

    if (!isValidWebsiteSession(userData, payload.token)) {
      this.clearSession()
      throw new ApiError(
        'Login concluído, mas a sessão não pôde ser iniciada. Tente novamente.',
        500,
      )
    }

    this.setSession(payload.token, userData)
    return response
  },

  async resetPassword(email: string) {
    return apiFetch<{ message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async verifyCode(code: string, email: string) {
    const response = await apiFetch<{ data: boolean }>('/auth/password-reset/check-code', {
      method: 'POST',
      body: JSON.stringify({ code, email }),
    })
    return response.data
  },

  async newPassword(password: string, code: string, email: string) {
    return apiFetch<{ message: string }>('/auth/password-reset/reset', {
      method: 'POST',
      body: JSON.stringify({ password, code, email }),
    })
  },

  async registerVisitant(data: RegisterVisitant) {
    return apiFetch<{ message: string }>('/auth/register-visitant', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async verifyActivationToken(token: string) {
    return apiFetchData<Cooperative>(`/auth/cooperative-activation/verify-token/${token}`)
  },

  async activateCooperative(token: string, formData: FormData) {
    return apiFetch(`/auth/cooperative-activation/active/${token}`, {
      method: 'POST',
      body: formData,
    })
  },

  handlePostLogin(response: LoginResponse) {
    const { role, redirectUrl } = response.data
    if (role !== 'ADMIN' && role !== 'COOPERATIVE') return false

    const dashboard = environment.dashboardUrl.replace(/\/$/, '')
    const autenticarMatch = redirectUrl?.match(/\/autenticar\/([^/?#]+)/)

    if (dashboard && autenticarMatch?.[1]) {
      window.location.href = `${dashboard}/autenticar/${autenticarMatch[1]}`
      return true
    }

    if (redirectUrl) {
      window.location.href = redirectUrl
      return true
    }

    return false
  },
}
