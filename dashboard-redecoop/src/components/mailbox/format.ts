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

export function buildReply(message: MailMessage, own: string[], all: boolean, fromSent = false) {
  const sender = message.replyTo?.[0]?.address || message.from?.address || ''
  const sentByMe = fromSent || isSelf(message.from?.address, own)
  // Responder algo que eu mesmo enviei volta para quem recebeu, como no Gmail.
  if (sentByMe) {
    const recipients = (message.to || []).map((item) => item.address).filter((item) => item && (!isSelf(item, own) || (message.to || []).length === 1))
    const ccMine = all ? (message.cc || []).map((item) => item.address).filter((item) => item && !isSelf(item, own)) : []
    const references = [message.references, message.messageId].filter(Boolean).join(' ')
    return {
      mode: all ? 'replyAll' : 'reply',
      to: (all ? recipients : recipients.slice(0, 1)).join(', ') || sender,
      cc: ccMine.join(', '),
      bcc: '',
      subject: subjectWithPrefix(message.subject || '', 'Re'),
      html: quoteBlock(message),
      sourceFolder: message.folder,
      sourceUid: message.uid,
      inReplyTo: message.messageId || undefined,
      references,
      includeSignature: true,
    }
  }
  const from = sender
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
    html: quoteBlock(message),
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

export function buildForwardAsAttachment(message: MailMessage) {
  return {
    mode: 'forward' as const,
    to: '',
    cc: '',
    bcc: '',
    subject: subjectWithPrefix(message.subject || '', 'Enc'),
    html: '<p><br></p><p>Segue a mensagem original em anexo.</p>',
    sourceFolder: message.folder,
    sourceUid: message.uid,
    inReplyTo: undefined,
    references: message.messageId || undefined,
    includeSignature: true,
  }
}

export function printableMessage(message: MailMessage) {
  const rows = [
    ['De', formatAddress({ name: message.from?.name || undefined, address: message.from?.address || '' })],
    ['Para', (message.to || []).map(formatAddress).join(', ')],
    ['Cc', (message.cc || []).map(formatAddress).join(', ')],
    ['Data', formatFullDate(message.date)],
  ].filter(([, value]) => value)
  const body = message.html || `<pre style="white-space:pre-wrap">${escapeHtml(message.text || '')}</pre>`
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'">
<title>${escapeHtml(message.subject || 'Mensagem')}</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#111;margin:24px;font-size:14px}h1{font-size:18px;margin:0 0 12px}
table{border-collapse:collapse;margin-bottom:16px}td{padding:2px 12px 2px 0;vertical-align:top}td:first-child{color:#555;font-weight:600}
hr{border:0;border-top:1px solid #ccc;margin:12px 0}img{max-width:100%}</style></head><body>
<h1>${escapeHtml(message.subject || '(sem assunto)')}</h1>
<table>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table><hr>
${body}
${message.attachments.length ? `<hr><p>Anexos: ${message.attachments.map((file) => escapeHtml(file.filename)).join(', ')}</p>` : ''}
</body></html>`
}
