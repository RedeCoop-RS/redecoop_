import type { MailAddress, MailMessage } from '@/services/mailbox.service'

const LABELS: Record<string, string> = {
  inbox: 'Caixa de entrada',
  sent: 'Enviados',
  drafts: 'Rascunhos',
  trash: 'Lixeira',
  spam: 'Spam',
  archive: 'Arquivo',
}

export function folderLabel(folder: { name: string; specialUse: string }) {
  if (folder.specialUse === 'other') return folder.name
  return LABELS[folder.specialUse] || folder.name
}

export function formatMailDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('pt-BR', sameYear
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatFullDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatBytes(size: number) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function displayAddress(address?: { name?: string | null; address?: string | null } | null) {
  if (!address) return ''
  return address.name || address.address || ''
}

export function formatAddress(address: MailAddress) {
  if (address.name) return `${address.name} <${address.address}>`
  return address.address
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function subjectWithPrefix(subject: string, prefix: 'Re' | 'Enc') {
  const cleaned = subject.replace(/^(re|fw|fwd|enc|res)\s*:\s*/i, '').trim()
  return `${prefix}: ${cleaned || '(sem assunto)'}`
}

function quoteBlock(message: MailMessage) {
  const when = formatFullDate(message.date)
  const from = displayAddress(message.from) || 'remetente'
  const body = message.html || `<pre>${escapeHtml(message.text || '')}</pre>`
  return `<p><br></p><blockquote><p>Em ${escapeHtml(when)}, ${escapeHtml(from)} escreveu:</p>${body}</blockquote>`
}

function isSelf(address: string | undefined | null, own: string[]) {
  const value = (address || '').trim().toLowerCase()
  return Boolean(value) && own.includes(value)
}

export function buildReply(message: MailMessage, own: string[], all: boolean) {
  const from = message.replyTo?.[0]?.address || message.from?.address || ''
  const toList = all
    ? [from, ...(message.to || []).map((item) => item.address)].filter((item, index, list) => {
        const key = item.toLowerCase()
        return item && !isSelf(item, own) && list.findIndex((entry) => entry.toLowerCase() === key) === index
      })
    : [from].filter(Boolean)
  const ccList = all
    ? (message.cc || [])
        .map((item) => item.address)
        .filter((item, index, list) => item && !isSelf(item, own) && list.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index)
    : []
  const references = [message.references, message.messageId].filter(Boolean).join(' ')
  return {
    mode: all ? 'replyAll' : 'reply',
    to: toList.join(', '),
    cc: ccList.join(', '),
    bcc: '',
    subject: subjectWithPrefix(message.subject || '', 'Re'),
    html: `<p><br></p>${quoteBlock(message)}`,
    sourceFolder: message.folder,
    sourceUid: message.uid,
    inReplyTo: message.messageId || undefined,
    references,
    includeSignature: true,
  }
}

export function buildForward(message: MailMessage) {
  const header = `
    <p><br></p>
    <p>---------- Mensagem encaminhada ----------</p>
    <p>De: ${escapeHtml(displayAddress(message.from))}<br>
    Data: ${escapeHtml(formatFullDate(message.date))}<br>
    Assunto: ${escapeHtml(message.subject || '')}<br>
    Para: ${escapeHtml((message.to || []).map(formatAddress).join(', '))}</p>
  `
  const body = message.html || `<pre>${escapeHtml(message.text || '')}</pre>`
  return {
    mode: 'forward' as const,
    to: '',
    cc: '',
    bcc: '',
    subject: subjectWithPrefix(message.subject || '', 'Enc'),
    html: `${header}${body}`,
    sourceFolder: message.folder,
    sourceUid: message.uid,
    inReplyTo: undefined,
    references: message.messageId || undefined,
    includeSignature: true,
  }
}
