import { Paperclip, Star } from 'lucide-react'
import type { MailDraft, MailListItem } from '@/services/mailbox.service'
import { displayAddress, formatMailDate } from './format'

interface MailboxListProps {
  messages: MailListItem[]
  drafts: MailDraft[]
  total: number
  page: number
  loading: boolean
  activeUid?: number
  selected: number[]
  onOpen: (message: MailListItem) => void
  onToggle: (uid: number) => void
  onStar: (message: MailListItem) => void
  onPage: (page: number) => void
  onDraft: (draft: MailDraft) => void
  onLoadOlder: () => void
}

export function MailboxList({
  messages,
  drafts,
  total,
  page,
  loading,
  activeUid,
  selected,
  onOpen,
  onToggle,
  onStar,
  onPage,
  onDraft,
  onLoadOlder,
}: MailboxListProps) {
  const pages = Math.max(1, Math.ceil(total / 30))
  return (
    <section className="mailbox-list" aria-label="Mensagens">
      {drafts.length > 0 && (
        <div className="mailbox-drafts">
          {drafts.slice(0, 3).map((draft) => (
            <button key={draft.id} type="button" onClick={() => onDraft(draft)}>
              Rascunho: {draft.subject || draft.to || 'sem assunto'}
            </button>
          ))}
        </div>
      )}
      {loading && <p className="mailbox-empty">Carregando mensagens…</p>}
      {!loading && messages.length === 0 && <p className="mailbox-empty">Nenhuma mensagem nesta pasta.</p>}
      <ul>
        {messages.map((message) => (
          <li key={message.uid}>
            <article className={`mailbox-row ${message.seen ? '' : 'mailbox-row--unread'} ${activeUid === message.uid ? 'mailbox-row--active' : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(message.uid)}
                onChange={() => onToggle(message.uid)}
                aria-label={`Selecionar ${message.subject}`}
              />
              <button type="button" className="mailbox-row__main" onClick={() => onOpen(message)}>
                <strong>{displayAddress({ name: message.fromName, address: message.fromAddress }) || '(sem remetente)'}</strong>
                <span>{message.subject || '(sem assunto)'}</span>
                {message.snippet && <small>{message.snippet}</small>}
              </button>
              <div className="mailbox-row__meta">
                <button type="button" aria-label={message.flagged ? 'Remover estrela' : 'Marcar com estrela'} className={message.flagged ? 'is-on' : ''} onClick={() => onStar(message)}>
                  <Star size={15} fill={message.flagged ? 'currentColor' : 'none'} />
                </button>
                {message.hasAttachments && <Paperclip size={14} aria-label="Possui anexo" />}
                <time>{formatMailDate(message.date)}</time>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <footer className="mailbox-pager">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima</button>
        <button type="button" onClick={onLoadOlder}>Carregar mais antigas</button>
      </footer>
    </section>
  )
}
