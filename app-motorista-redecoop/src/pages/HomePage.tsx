import { DriverProfile } from '@/components/DriverProfile'
import { TravelsSection } from '@/components/TravelsSection'
import { useTravels } from '@/contexts/TravelsContext'

export function HomePage() {
  const { loading, inProgress } = useTravels()

  return (
    <div className="bg-section-mist min-h-dvh">
      <DriverProfile />
      <TravelsSection
        kicker="Suas rotas"
        title="Em andamento"
        description="Viagens que você já iniciou e está executando agora."
        travels={inProgress}
        loading={loading}
        emptyIcon="local_shipping"
        emptyMessage="Nenhuma viagem em andamento no momento."
      />
    </div>
  )
}
