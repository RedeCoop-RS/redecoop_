import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import type { Travel, TravelRoute } from '@/types'
import {
  TRAVEL_STATUS_LABELS,
  badgeClass,
  calculateFreeLoad,
  formatTravelDate,
} from '@/lib/travel'

interface StopTimelineProps {
  routes: TravelRoute[]
  travel: Travel
  muted?: boolean
}

export function StopTimeline({ routes, travel, muted = false }: StopTimelineProps) {
  return (
    <div className="space-y-0">
      {routes.map((stop, i) => (
        <div key={stop.id} className="flex items-start mb-1 last:mb-0">
          <div className="stop-timeline__icon">
            <div
              className={`stop-timeline__dot${muted ? ' stop-timeline__dot--muted' : ''}`}
            >
              {i + 1}
            </div>
            {i < routes.length - 1 && (
              <div
                className={`stop-timeline__line${muted ? ' stop-timeline__line--muted' : ''}`}
              />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5 pb-4">
            <p
              className={`mb-1 font-semibold text-sm leading-snug break-words ${
                muted ? 'text-grey' : 'text-ink'
              }`}
            >
              {stop.address}
            </p>
            {!muted && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-grey-dark">
                {!!stop.loadingWeight && (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="material-icons text-[0.9rem] text-green">arrow_upward</span>
                    {stop.loadingWeight}
                  </span>
                )}
                {!!stop.unloadingWeight && (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="material-icons text-[0.9rem] text-red">arrow_downward</span>
                    {stop.unloadingWeight}
                  </span>
                )}
                <span className="font-medium">Livre: {calculateFreeLoad(i, travel)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface TravelCardProps {
  travel: Travel
  completed?: boolean
  onStart?: (id: number) => void
}

export function TravelCard({ travel, completed = false, onStart }: TravelCardProps) {
  return (
    <article
      className={`glass-card rounded-2xl mb-4 overflow-hidden transition-smooth hover:shadow-xl hover:shadow-green/8 ${
        completed ? 'opacity-80' : ''
      }`}
    >
      <div className="p-4 sm:p-5 flex justify-between items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <span className="flex items-center gap-2 font-bold text-sm text-grey-dark">
            <span className="material-icons text-green text-[1.1rem]">event_note</span>
            {formatTravelDate(travel.startDateTime)}
          </span>
          <p className="flex items-start gap-2 mt-1.5 text-xs text-grey-dark leading-relaxed">
            <span className="material-icons text-[1rem] shrink-0 mt-0.5">local_shipping</span>
            <span className="break-words">
              {travel.vehicle?.model} — {travel.vehicle?.type?.name} —{' '}
              {travel.vehicle?.licensePlate}
            </span>
          </p>
        </div>
        <span
          className={
            completed
              ? 'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide bg-grey/20 text-grey-dark shrink-0'
              : badgeClass(travel.status)
          }
        >
          {TRAVEL_STATUS_LABELS[travel.status] ?? travel.status}
        </span>
      </div>

      {!!travel.travelRoutes?.length && (
        <div className="px-4 sm:px-5 pb-4 border-t border-gray-50 pt-4">
          <StopTimeline
            routes={travel.travelRoutes}
            travel={travel}
            muted={completed}
          />
        </div>
      )}

      {!completed && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1">
          {travel.status === 'awaiting' && travel.readyToStart && (
            <Button fullWidth onClick={() => onStart?.(travel.id)}>
              Iniciar viagem
            </Button>
          )}
          {travel.status === 'awaiting' && !travel.readyToStart && (
            <p className="text-center text-sm text-grey-dark bg-yellow-soft/50 rounded-xl px-4 py-3">
              Há ofertas pendentes nesta viagem. Quando estiverem confirmadas ou recusadas, você
              poderá iniciar.
            </p>
          )}
          {travel.status === 'in_progress' && (
            <Link to={`/viagem-em-andamento/${travel.id}`} className="block">
              <Button fullWidth>Continuar viagem</Button>
            </Link>
          )}
          {travel.status === 'canceled' && (
            <p className="text-center text-sm text-grey-dark bg-red/5 rounded-xl px-4 py-3">
              Esta viagem foi cancelada.
            </p>
          )}
        </div>
      )}
    </article>
  )
}
