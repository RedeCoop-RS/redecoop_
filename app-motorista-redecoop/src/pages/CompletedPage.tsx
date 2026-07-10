import { TravelsSection } from '@/components/TravelsSection'
import { useTravels } from '@/contexts/TravelsContext'

export function CompletedPage() {
  const { loading, completed } = useTravels()

  return (
    <div className="bg-section-mist min-h-dvh pt-6">
      <TravelsSection
        kicker="Histórico"
        title="Finalizadas"
        description="Viagens que você já concluiu."
        travels={completed}
        loading={loading}
        completed
        emptyIcon="check_circle"
        emptyMessage="Nenhuma viagem finalizada ainda."
      />
    </div>
  )
}
