import { getBasePath } from '@/config/navigation'
import type { Conversation, Notification } from '@/types'
import { UserRole } from '@/types'

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

export function parseNotificationMeta(message: string): {
  conversationId?: number
  senderName?: string
} {
  const cidMatch = message.match(/<cid>(\d+)<\/cid>/i)
  const conversationId = cidMatch ? Number(cidMatch[1]) : undefined
  const plain = stripNotificationTags(message)
  const senderMatch = plain.match(/Mensagem de (.+?):/i)
  return {
    conversationId: Number.isFinite(conversationId) && conversationId! > 0 ? conversationId : undefined,
    senderName: senderMatch?.[1]?.trim() || undefined,
  }
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

export function matchConversationId(conversations: Conversation[], senderName?: string) {
  if (!senderName) return undefined
  const target = normalizeName(senderName)
  const match = conversations.find((conversation) => {
    const names = [
      conversation.initiatorCooperative?.companyName,
      conversation.initiatorCooperative?.fantasyName,
      conversation.participantCooperative?.companyName,
      conversation.participantCooperative?.fantasyName,
    ]
      .filter((name): name is string => Boolean(name))
      .map(normalizeName)
    return names.includes(target)
  })
  return match?.id
}

export function getNotificationPath(
  role: UserRole,
  notification: Notification,
  conversationId?: number,
) {
  const basePath = getBasePath(role)
  const type = notification.type
  if (type === 'new_message' || conversationId) {
    return conversationId
      ? `${basePath}/mensagens?conversation=${conversationId}`
      : `${basePath}/mensagens`
  }
  if (type === 'travel_offer') return `${basePath}/viagens-disponiveis`
  if (type === 'business_desk') return `${basePath}/balcao-de-negocios`
  if (type === 'collective_purchase') return `${basePath}/compras-coletivas`
  return `${basePath}/mensagens`
}

function stripNotificationTags(message: string) {
  return message
    .replace(/<cid>\d+<\/cid>/gi, '')
    .replace(/<date>(.*?)<\/date>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatNotificationMessage(message: string): string {
  const withDates = message.replace(/<date>(.*?)<\/date>/g, (_, value: string) => {
    const raw = String(value).trim()
    // Já vem como YYYY-MM-DD (America/Sao_Paulo) da API — evita shift UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-')
      return `${d}/${m}/${y}`
    }
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return raw
    return date.toLocaleDateString('pt-BR')
  })

  return withDates
    .replace(/<cid>\d+<\/cid>/gi, '')
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
