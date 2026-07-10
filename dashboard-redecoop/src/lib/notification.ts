import type { Notification } from '@/types'

const NOTIFICATION_ICONS: Record<string, string> = {
  new_message: '/assets/imgs/icons/notifications/new_message.svg',
  business_desk: '/assets/imgs/icons/notifications/business_desk.svg',
  collective_purchase: '/assets/imgs/icons/notifications/collective_purchase.svg',
  travel_offer: '/assets/imgs/icons/notifications/travel_offer.svg',
}

const NOTIFICATION_LABELS: Record<string, string> = {
  new_message: 'Mensagem',
  business_desk: 'Balcão de negócios',
  collective_purchase: 'Compra coletiva',
  travel_offer: 'Viagem',
}

export function normalizeNotification(raw: Record<string, unknown>): Notification {
  return {
    id: Number(raw.id),
    message: String(raw.message ?? ''),
    read: Boolean(raw.read ?? raw.isRead ?? false),
    createdAt: String(raw.createdAt ?? ''),
    type: typeof raw.type === 'string' ? raw.type : undefined,
  }
}

export function formatNotificationMessage(message: string): string {
  const withDates = message.replace(/<date>(.*?)<\/date>/g, (_, value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('pt-BR')
  })

  return withDates
    .replace(/<\/?span>/g, '')
    .replace(/<b>/g, '<strong>')
    .replace(/<\/b>/g, '</strong>')
}

export function getNotificationIcon(type?: string) {
  if (!type) return NOTIFICATION_ICONS.new_message
  return NOTIFICATION_ICONS[type] ?? NOTIFICATION_ICONS.new_message
}

export function getNotificationLabel(type?: string) {
  if (!type) return 'Notificação'
  return NOTIFICATION_LABELS[type] ?? 'Notificação'
}

export function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
