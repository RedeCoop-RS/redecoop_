import { useAuth } from '@/contexts/AuthContext'
import { displayUserName } from '@/components/layout/UserMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { CooperativeDashboard } from '@/components/home/CooperativeDashboard'
import { AdminDashboard } from '@/components/home/AdminDashboard'

export function HomePage() {
  const { user, isAdmin } = useAuth()

  const displayName = user
    ? displayUserName(
        user.username,
        user.role,
        user.cooperative?.fantasyName ?? user.cooperative?.name,
      )
    : ''

  return (
    <div>
      <div className="home-hero mb-8">
        <div className="home-hero__stripe">
          <span />
          <span />
          <span />
        </div>
        <PageHeader
          kicker={isAdmin ? 'Painel do dia' : 'Bem-vindo'}
          title={`Olá, ${displayName}`}
          description={
            isAdmin
              ? 'O que precisa de você agora — e um recorte da rede.'
              : 'Gerencie produtos, negócios e viagens da sua cooperativa.'
          }
        />
      </div>

      {isAdmin && <AdminDashboard />}

      {!isAdmin && user?.cooperative?.id != null && (
        <CooperativeDashboard cooperativeId={user.cooperative.id} />
      )}
    </div>
  )
}
