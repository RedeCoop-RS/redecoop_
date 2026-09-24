import type { Travel } from '@/types'

export const TRAVEL_STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em andamento',
  awaiting: 'Aguardando',
  completed: 'Finalizado',
  canceled: 'Cancelado',
}

const BADGE_BASE =
  'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide'

export function badgeClass(status: string): string {
  switch (status) {
    case 'in_progress':
      return `${BADGE_BASE} bg-green text-white`
    case 'awaiting':
      return `${BADGE_BASE} bg-yellow-soft text-ink`
    case 'completed':
      return `${BADGE_BASE} bg-grey/20 text-grey-dark`
    case 'canceled':
      return `${BADGE_BASE} bg-red/10 text-red`
    default:
      return `${BADGE_BASE} bg-grey/20 text-grey-dark`
  }
}

export function calculateFreeLoad(
  stopIndex: number,
  travel: Travel,
): number {
  const maximumWeight = Number(travel?.vehicle?.maximumWeight)
  if (!Number.isFinite(maximumWeight)) return 0

  let currentLoad = 0
  const routes = travel.travelRoutes ?? []

  for (let i = 0; i <= stopIndex; i++) {
    const stop = routes[i]
    if (!stop) continue
    currentLoad += Number(stop.loadingWeight) || 0
    currentLoad -= Number(stop.unloadingWeight) || 0
  }

  const free = maximumWeight - currentLoad
  return Number.isFinite(free) ? free : 0
}

export function formatTravelDate(date: string): string {
  const d = new Date(date)
  const day = d.toLocaleDateString('pt-BR')
  const hour = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} - ${hour.replace(':', 'h')}`
}

export function formatBirthDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR')
}

export function markCurrentRoutes(travel: Travel): Travel {
  let foundCurrentRoute = false
  const travelRoutes = travel.travelRoutes.map((stop) => {
    if (!foundCurrentRoute && stop.arrivedAt == null) {
      foundCurrentRoute = true
      return { ...stop, currentRoute: true }
    }
    return { ...stop, currentRoute: false }
  })
  return { ...travel, travelRoutes }
}

export function sortActiveTravels<T extends { status: string; startDateTime: string }>(
  travels: T[],
): { active: T[]; completed: T[] } {
  const byStart = (a: T, b: T) =>
    new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  const byStartDesc = (a: T, b: T) => -byStart(a, b)

  return {
    active: travels.filter((t) => t.status !== 'completed').sort(byStart),
    completed: travels.filter((t) => t.status === 'completed').sort(byStartDesc),
  }
}

export function categorizeTravels<T extends { status: string; startDateTime: string }>(
  travels: T[],
): { inProgress: T[]; awaiting: T[]; completed: T[] } {
  const byStart = (a: T, b: T) =>
    new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  const byStartDesc = (a: T, b: T) => -byStart(a, b)

  return {
    inProgress: travels.filter((t) => t.status === 'in_progress').sort(byStart),
    awaiting: travels
      .filter((t) => t.status === 'awaiting' || t.status === 'canceled')
      .sort(byStart),
    completed: travels.filter((t) => t.status === 'completed').sort(byStartDesc),
  }
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function stripCpf(value: string): string {
  return value.replace(/\D/g, '')
}
