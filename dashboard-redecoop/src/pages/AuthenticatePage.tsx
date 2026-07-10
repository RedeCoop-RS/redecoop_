import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/Button'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { ApiError } from '@/lib/api'
import { isSameOriginAsWebsite, redirectToWebsite } from '@/lib/redirect'
import { UserRole } from '@/types'

export function AuthenticatePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token inválido.')
      return
    }

    authService
      .authenticate(token)
      .then((data) => {
        if (data.user.role === UserRole.ADMIN) {
          navigate('/admin', { replace: true })
          return
        }
        navigate('/cooperativa', { replace: true })
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Não foi possível autenticar. Tente fazer login novamente pelo site.'
        setError(message)
      })
  }, [token, navigate])

  if (error) {
    return (
      <div className="auth-page">
        <div className="panel-card max-w-md p-8 text-center">
          <img src="/assets/imgs/logo.png" alt="RedeCoop" className="mx-auto mb-6 h-12" />
          <p className="text-sm text-red">{error}</p>
          {!isSameOriginAsWebsite() && (
            <Button
              className="mt-6"
              variant="secondary"
              onClick={() => redirectToWebsite()}
            >
              Voltar ao site
            </Button>
          )}
        </div>
      </div>
    )
  }

  return <LoadingOverlay visible message="Autenticando..." />
}
