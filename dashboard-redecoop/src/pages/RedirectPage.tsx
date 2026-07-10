import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { isSameOriginAsWebsite, redirectToWebsite } from '@/lib/redirect'
import { UserRole } from '@/types'

export function RedirectPage() {
  const { user, isLoading } = useAuth()
  const redirected = useRef(false)

  const hasValidRole =
    user?.role === UserRole.ADMIN || user?.role === UserRole.COOPERATIVE

  const shouldLeaveApp = !isLoading && (!user || !hasValidRole)

  useEffect(() => {
    if (!shouldLeaveApp || redirected.current) return
    redirected.current = true
    redirectToWebsite()
  }, [shouldLeaveApp])

  if (isLoading) {
    return <LoadingOverlay visible message="Redirecionando..." />
  }

  if (shouldLeaveApp) {
    if (isSameOriginAsWebsite()) {
      return (
        <div className="auth-page">
          <div className="panel-card max-w-md p-8 text-center">
            <img src="/assets/imgs/logo.png" alt="RedeCoop" className="mx-auto mb-6 h-12" />
            <h1 className="font-display text-xl font-bold text-ink">Sessão não encontrada</h1>
            <p className="mt-3 text-sm text-grey-dark">
              Faça login pelo site da RedeCoop para acessar o painel.
            </p>
            <p className="mt-2 text-xs text-grey">
              Dica: o site deve rodar em outra porta (ex.: site <strong>5173</strong>, painel{' '}
              <strong>5174</strong>).
            </p>
          </div>
        </div>
      )
    }

    return <LoadingOverlay visible message="Redirecionando para o site..." />
  }

  if (user!.role === UserRole.ADMIN) {
    return <Navigate to="/admin" replace />
  }

  return <Navigate to="/cooperativa" replace />
}
