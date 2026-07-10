import { apiFetch } from '@/lib/api'
import type { LoginCredentials, LoginResponse, User } from '@/types'

const USER_KEY = 'currentUser'
const TOKEN_KEY = 'token'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw || raw === 'undefined') return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function getStoredUser(): User | null {
  return readStoredUser()
}

export function persistSession(user: User, token: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearSession() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

  if (response.data.role !== 'DRIVER') {
    throw new Error('Você não tem permissão para acessar esta área.')
  }

  persistSession(response.data.userData, response.data.token)
  return response.data.userData
}
