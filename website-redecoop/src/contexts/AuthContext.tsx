import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '@/services/auth.service'
import type { UserData } from '@/types'

interface AuthContextValue {
  user: UserData | null
  isLoggedIn: boolean
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => authService.getStoredUser())

  const refresh = useCallback(() => {
    setUser(authService.getStoredUser())
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onAuthChange = () => refresh()
    window.addEventListener('auth:login', onAuthChange)
    window.addEventListener('auth:logout', onAuthChange)
    return () => {
      window.removeEventListener('auth:login', onAuthChange)
      window.removeEventListener('auth:logout', onAuthChange)
    }
  }, [refresh])

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
