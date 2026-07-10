import type { TravelRoute } from '@/types'
import { totalRouteKm } from '@/lib/travel'

function truncateAddress(address?: string, max = 40) {
  if (!address) return '—'
  return address.length > max ? `${address.slice(0, max)}…` : address
}

export function RouteTimeline({
  routes,
  variant = 'green',
  showTotal = true,
}: {
  routes?: TravelRoute[]
  variant?: 'green' | 'blue'
  showTotal?: boolean
}) {
  if (!routes?.length) {
    return <p className="travel-empty-inline">Nenhuma parada cadastrada.</p>
  }

  return (
    <div className="travel-route-timeline">
      {routes.map((stop, index) => {
        const last = index === routes.length - 1
        const nextDistance = routes[index + 1]?.distance
        return (
          <div key={`${stop.order}-${stop.address}-${index}`} className="travel-route-timeline__row">
            <div className="travel-route-timeline__distance">
              {!last && nextDistance != null ? <span>{nextDistance}km</span> : null}
            </div>
            <div className="travel-route-timeline__stop">
              <div className={`travel-route-timeline__icon${last ? ' travel-route-timeline__icon--last' : ''}`}>
                <span className={`travel-route-timeline__circle travel-route-timeline__circle--${variant}`}>
                  {stop.order ?? index + 1}
                </span>
              </div>
              <div className="travel-route-timeline__details">
                <p className="travel-route-timeline__address" title={stop.address}>
                  {truncateAddress(stop.address, 60)}
                </p>
                <div className="travel-route-timeline__meta">
                  {(stop.loadingWeight ?? stop.load) != null && (
                    <span>↑ {Number(stop.loadingWeight ?? stop.load)}</span>
                  )}
                  {(stop.unloadingWeight ?? stop.unload) != null && (
                    <span>↓ {Number(stop.unloadingWeight ?? stop.unload)}</span>
                  )}
                  {stop.remainingCapacity != null && <span>LIVRE: {stop.remainingCapacity}</span>}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      {showTotal && <p className="travel-route-timeline__total">TOTAL: {totalRouteKm(routes)}km</p>}
    </div>
  )
}
