import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'

interface RoleGuardProps {
  role: UserRole
}

export function RoleGuard({ role }: RoleGuardProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingOverlay visible message="Verificando sessão..." />
  }

  if (!user) {
    return <Navigate to="/redirect" state={{ from: location }} replace />
  }

  if (user.role !== role) {
    const redirect = user.role === UserRole.ADMIN ? '/admin' : '/cooperativa'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}
