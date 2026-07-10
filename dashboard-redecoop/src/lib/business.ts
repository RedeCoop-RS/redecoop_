import { BusinessStatus, BusinessType, type Business, type Cooperative } from '@/types'

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  [BusinessStatus.Negotiating]: 'Negociando',
  [BusinessStatus.Confirmed]: 'Confirmado',
  [BusinessStatus.Done]: 'Realizado',
  [BusinessStatus.Canceled]: 'Cancelado',
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.CC]: 'Compra coletiva',
  [BusinessType.BN]: 'Balcão',
  [BusinessType.V]: 'Viagem',
}

export function businessStatusLabel(status?: string) {
  if (!status) return '—'
  return BUSINESS_STATUS_LABELS[status as BusinessStatus] ?? status
}

export function businessStatusClass(status?: string) {
  switch (status) {
    case BusinessStatus.Confirmed:
      return 'business-status business-status--confirmed'
    case BusinessStatus.Done:
      return 'business-status business-status--done'
    case BusinessStatus.Canceled:
      return 'business-status business-status--cancelled'
    case BusinessStatus.Negotiating:
    default:
      return 'business-status business-status--negotiating'
  }
}

export function cooperativeBusinessLabel(c?: { companyName?: string; fantasyName?: string }) {
  return (c?.companyName ?? c?.fantasyName ?? '').trim() || '—'
}

export function formatBusinessDate(value?: string | Date) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day} - ${time}`
}

export function formatBusinessFee(fee?: number | string | null) {
  if (fee == null || fee === '') return '—'
  const n = typeof fee === 'number' ? fee : Number(fee)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function getLastTravelStop(business: Business) {
  const routes = business.travelOffer?.routes
  if (!routes?.length) return '—'
  const last = routes[routes.length - 1]
  const address = last?.address ?? ''
  if (!address) return '—'
  return address.length > 40 ? `${address.slice(0, 40)}…` : address
}

export function isUserOfferingBusiness(business: Business, coopId?: number) {
  if (!coopId) return false
  return business.offeringCooperativeId === coopId || business.offeringCooperative?.id === coopId
}

export function businessListTitle(business: Business) {
  return business.type ? `${business.type}-${business.id}` : `Negócio #${business.id}`
}

export function businessRecentSubtitle(business: Business, coopId: number) {
  const parts: string[] = []
  parts.push(isUserOfferingBusiness(business, coopId) ? 'Oferta recebida' : 'Oferta enviada')

  if (business.type === BusinessType.V) {
    const stop = getLastTravelStop(business)
    if (stop !== '—') {
      parts.push(stop)
    } else {
      const travelCoop =
        (business.travelOffer as { cooperative?: Cooperative } | undefined)?.cooperative ??
        business.cooperative
      const label = cooperativeBusinessLabel(travelCoop)
      if (label !== '—') parts.push(label)
    }
  } else {
    const isOffering = isUserOfferingBusiness(business, coopId)
    const other = isOffering ? business.requestingCooperative : business.offeringCooperative
    const label = cooperativeBusinessLabel(other)
    if (label !== '—') parts.push(`com ${label}`)
  }

  const date = formatBusinessDate(business.createdAt)
  if (date !== '—') parts.push(date)

  return parts.join(' · ')
}

export function businessUnreadMessagesCount(business: Business) {
  return business.conversation?.totalMessagesNotSeenByMe ?? 0
}

export function businessUnreadCount(business: Business) {
  const conv = business.conversation
  if (!conv) return 0
  return businessUnreadMessagesCount(business) + (conv.awaitingMediation ? 1 : 0)
}

export function buildDateFilter(year: string, month: string) {
  if (!year.trim()) return ''

  const y = Number(year)
  if (Number.isNaN(y)) return ''

  const hasMonth = month.trim() !== ''
  const m = Number(month)

  if (hasMonth && !Number.isNaN(m)) {
    const start = formatApiDate(new Date(y, m, 1))
    const end = formatApiDate(new Date(y, m + 1, 0))
    return `${start},${end}`
  }

  return `${y}-01-01,${y}-12-31`
}

function formatApiDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const BUSINESS_MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' }),
)

export const BUSINESS_YEARS = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() - i))
