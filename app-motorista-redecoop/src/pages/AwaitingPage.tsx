import { TravelsSection } from '@/components/TravelsSection'
import { useTravels } from '@/contexts/TravelsContext'

export function AwaitingPage() {
  const { loading, awaiting } = useTravels()

  return (
    <div className="bg-section-mist min-h-dvh pt-6">
      <TravelsSection
        kicker="Suas rotas"
        title="Aguardando"
        description="Viagens designadas a você que ainda não foram iniciadas."
        travels={awaiting}
        loading={loading}
        emptyIcon="schedule"
        emptyMessage="Nenhuma viagem aguardando início."
      />
    </div>
  )
}
