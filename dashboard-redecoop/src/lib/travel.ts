import type { Travel, TravelRoute } from '@/types'

export const TRAVEL_STATUS_LABELS: Record<string, string> = {
  awaiting: 'Aguardando',
  completed: 'Finalizado',
  canceled: 'Cancelado',
  cancelled: 'Cancelado',
  in_progress: 'Em Viagem',
}

export const TRAVEL_OFFER_STATUS_LABELS: Record<string, string> = {
  awaiting: 'Aguardando',
  negotiating: 'Negociando',
  confirmed: 'Confirmado',
  confirmedPendingRoutes: 'Confirmado',
  rejected: 'Rejeitado',
}

export function travelStatusLabel(status?: string) {
  if (!status) return '—'
  return TRAVEL_STATUS_LABELS[status] ?? status
}

export function travelOfferStatusLabel(status?: string) {
  if (!status) return '—'
  const label = TRAVEL_OFFER_STATUS_LABELS[status] ?? status
  if (status === 'confirmedPendingRoutes') return `${label} - Em Ajuste`
  return label
}

export function travelStatusClass(status?: string) {
  switch (status) {
    case 'completed':
      return 'travel-status travel-status--completed'
    case 'canceled':
    case 'cancelled':
      return 'travel-status travel-status--canceled'
    case 'in_progress':
      return 'travel-status travel-status--progress'
    case 'awaiting':
    default:
      return 'travel-status travel-status--awaiting'
  }
}

export function travelOfferStatusClass(status?: string) {
  switch (status) {
    case 'confirmed':
    case 'confirmedPendingRoutes':
      return 'travel-offer-status travel-offer-status--confirmed'
    case 'rejected':
      return 'travel-offer-status travel-offer-status--rejected'
    case 'negotiating':
      return 'travel-offer-status travel-offer-status--negotiating'
    default:
      return 'travel-offer-status travel-offer-status--awaiting'
  }
}

export function getTravelRoutes(travel?: Travel | null) {
  return travel?.travelRoutes ?? travel?.routes ?? []
}

export function getLastTravelRouteAddress(travel?: Travel | null) {
  const routes = getTravelRoutes(travel)
  if (!routes.length) return '—'
  const address = routes[routes.length - 1]?.address ?? ''
  if (!address) return '—'
  return address.length > 40 ? `${address.slice(0, 40)}…` : address
}

export function totalRouteKm(routes?: TravelRoute[]) {
  if (!routes?.length) return 0
  return Number(routes.reduce((sum, route) => sum + (route.distance ?? 0), 0).toFixed(2))
}

export function formatTravelDateTime(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTravelDeparture(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return `${day} - ${date.getHours()}h`
}

export function formatTravelStepDateTime(date: string, hour: string) {
  if (!date || !hour) return '—'
  const [y, m, d] = date.split('-')
  const h = hour.split(':')[0]
  return `${d}/${m}/${y} - ${h}h`
}

export function calculateFreeLoadAtStop(
  routes: TravelRoute[],
  stopIndex: number,
  maximumWeight: number,
) {
  let currentLoad = 0
  for (let i = 0; i <= stopIndex; i++) {
    const stop = routes[i]
    currentLoad += Number(stop.loadingWeight ?? stop.load ?? 0)
    currentLoad -= Number(stop.unloadingWeight ?? stop.unload ?? 0)
  }
  return maximumWeight - currentLoad
}

export function buildStartDateTimeUtc(date: string, hour: string) {
  const local = new Date(`${date}T${hour}:00`)
  return local.toISOString()
}

export function getRouteCoordinates(route: TravelRoute) {
  const lat = Number(route.latitude)
  const lng = Number(route.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng }
  }
  const nested = (route as { coordinates?: { latitude?: number; longitude?: number } }).coordinates
  if (nested) {
    const nestedLat = Number(nested.latitude)
    const nestedLng = Number(nested.longitude)
    if (Number.isFinite(nestedLat) && Number.isFinite(nestedLng)) {
      return { latitude: nestedLat, longitude: nestedLng }
    }
  }
  return null
}

export async function refreshRouteDistances(
  routes: TravelRoute[],
  calcDistance: (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ) => Promise<number>,
) {
  const list = routes.map((route, index) => ({ ...route, order: index + 1 }))

  for (let i = 0; i < list.length; i++) {
    if (i === 0) {
      list[i] = { ...list[i], distance: 0 }
      continue
    }

    const prev = getRouteCoordinates(list[i - 1])
    const curr = getRouteCoordinates(list[i])
    if (!prev || !curr) continue

    const distance = await calcDistance(prev, curr)
    list[i] = { ...list[i], distance: Number(Number(distance).toFixed(2)) }
  }

  return list
}
