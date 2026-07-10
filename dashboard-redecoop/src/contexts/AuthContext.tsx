import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '@/services/auth.service'
import type { User } from '@/types'
import { UserRole } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  isCooperative: boolean
  logout: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(() => {
    setUser(authService.getStoredUser())
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  useEffect(() => {
    refreshUser()
    setIsLoading(false)

    const onLogin = () => refreshUser()
    const onLogout = () => setUser(null)
    window.addEventListener('auth:login', onLogin)
    window.addEventListener('auth:logout', onLogout)
    return () => {
      window.removeEventListener('auth:login', onLogin)
      window.removeEventListener('auth:logout', onLogout)
    }
  }, [refreshUser])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAdmin: user?.role === UserRole.ADMIN,
      isCooperative: user?.role === UserRole.COOPERATIVE,
      logout,
      refreshUser,
    }),
    [user, isLoading, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
