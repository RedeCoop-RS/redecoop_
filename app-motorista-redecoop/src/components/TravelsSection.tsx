import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { TravelCard } from '@/components/TravelCard'
import { useLoading } from '@/contexts/LoadingContext'
import { useTravels } from '@/contexts/TravelsContext'
import { ApiError } from '@/lib/api'
import { startTravel } from '@/services/driver.service'
import type { Travel } from '@/types'

interface TravelsSectionProps {
  kicker: string
  title: string
  description: string
  travels: Travel[]
  loading: boolean
  completed?: boolean
  emptyIcon: string
  emptyMessage: string
}

export function TravelsSection({
  kicker,
  title,
  description,
  travels,
  loading,
  completed = false,
  emptyIcon,
  emptyMessage,
}: TravelsSectionProps) {
  const { show, hide } = useLoading()
  const navigate = useNavigate()
  const { refresh } = useTravels()

  async function handleStartTravel(travelId: number) {
    show()
    try {
      await startTravel(travelId)
      toast.success('Rota iniciada com sucesso')
      await refresh()
      navigate(`/viagem-em-andamento/${travelId}`)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Não foi possível iniciar a viagem.'
      toast.error(msg)
    } finally {
      hide()
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 mt-8 pb-8">
      <div className="mb-5">
        <span className="app-kicker">{kicker}</span>
        <h2 className="text-xl font-bold text-ink mt-1">{title}</h2>
        {!loading && (
          <p className="text-sm text-grey-dark mt-1 leading-relaxed">{description}</p>
        )}
      </div>

      {travels.map((travel) => (
        <TravelCard
          key={travel.id}
          travel={travel}
          completed={completed}
          onStart={completed ? undefined : handleStartTravel}
        />
      ))}

      {!travels.length && !loading && (
        <div className="glass-card rounded-2xl p-8 text-center">
          <span className={`material-icons text-4xl text-green/30 mb-2 block`}>{emptyIcon}</span>
          <p className="text-grey-dark text-sm">{emptyMessage}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      )}
    </section>
  )
}
