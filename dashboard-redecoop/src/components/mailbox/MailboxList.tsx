import { AlertCircle, ArrowDown, CalendarClock, Paperclip, Star } from 'lucide-react'
import type { MailDraft, MailListItem } from '@/services/mailbox.service'
import { displayAddress, formatFullDate, formatMailDate } from './format'
import { DRAG_TYPE } from './MailboxFolders'

interface MailboxListProps {
  folderPath?: string
  messages: MailListItem[]
  drafts: MailDraft[]
  total: number
  page: number
  loading: boolean
  activeUid?: number
  selected: number[]
  threads: boolean
  onOpen: (message: MailListItem) => void
  onToggle: (uid: number) => void
  onToggleAll: () => void
  onStar: (message: MailListItem) => void
  onPage: (page: number) => void
  onDraft: (draft: MailDraft) => void
  onLoadOlder: () => void
}

export function MailboxList(props: MailboxListProps) {
  const { messages, selected } = props
  const pages = Math.max(1, Math.ceil(props.total / 30))
  const allSelected = messages.length > 0 && selected.length === messages.length
  const unsent = props.drafts.filter((draft) => !draft.scheduledAt)

  return (
    <section className="mailbox-list" aria-label="Mensagens">
      {unsent.length > 0 && (
        <div className="mailbox-drafts">
          {unsent.slice(0, 3).map((draft) => (
            <button key={draft.id} type="button" onClick={() => props.onDraft(draft)}>
              {draft.scheduleError ? <AlertCircle size={13} /> : null} Rascunho: {draft.subject || draft.to || 'sem assunto'}
            </button>
          ))}
        </div>
      )}
      {messages.length > 0 && (
        <div className="mailbox-list__head">
          <label className="mailbox-check">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(element) => {
                if (element) element.indeterminate = selected.length > 0 && !allSelected
              }}
              onChange={props.onToggleAll}
              aria-label="Selecionar todas desta página"
            />
            {selected.length ? `${selected.length} selecionada(s)` : 'Selecionar todas'}
          </label>
        </div>
      )}
      {props.loading && <p className="mailbox-empty">Carregando mensagens…</p>}
      {!props.loading && messages.length === 0 && <p className="mailbox-empty">Nenhuma mensagem nesta pasta.</p>}
      <ul>
        {messages.map((message) => {
          const unread = props.threads ? (message.threadUnread ?? (message.seen ? 0 : 1)) > 0 : !message.seen
          return (
            <li key={message.uid}>
              <article
                className={`mailbox-row ${unread ? 'mailbox-row--unread' : ''} ${props.activeUid === message.uid ? 'mailbox-row--active' : ''} ${selected.includes(message.uid) ? 'mailbox-row--selected' : ''}`}
                draggable
                data-uid={message.uid}
                onDragStart={(event) => {
                  const uids = selected.includes(message.uid) ? selected : [message.uid]
                  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ folder: props.folderPath, uids }))
                  event.dataTransfer.setData('text/plain', `${uids.length} mensagem(ns)`)
                  event.dataTransfer.effectAllowed = 'move'
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(message.uid)}
                  onChange={() => props.onToggle(message.uid)}
                  aria-label={`Selecionar ${message.subject}`}
                />
                <button type="button" className="mailbox-row__main" onClick={() => props.onOpen(message)}>
                  <strong>
                    {message.priority === 'high' && <span className="mailbox-priority" title="Prioridade alta" aria-label="Prioridade alta">!</span>}
                    {message.priority === 'low' && <ArrowDown size={12} aria-label="Prioridade baixa" />}
                    {displayAddress({ name: message.fromName, address: message.fromAddress }) || '(sem remetente)'}
                    {props.threads && (message.threadCount || 1) > 1 && <span className="mailbox-thread-count" aria-label={`${message.threadCount} mensagens na conversa`}>{message.threadCount}</span>}
                  </strong>
                  <span>{message.subject || '(sem assunto)'}</span>
                  {message.snippet && <small>{message.snippet}</small>}
                </button>
                <div className="mailbox-row__meta">
                  <button type="button" aria-label={message.flagged ? 'Remover estrela' : 'Marcar com estrela'} className={message.flagged ? 'is-on' : ''} onClick={() => props.onStar(message)}>
                    <Star size={15} fill={message.flagged ? 'currentColor' : 'none'} />
                  </button>
                  {message.hasAttachments && <Paperclip size={14} aria-label="Possui anexo" />}
                  <time dateTime={message.date || undefined} title={formatFullDate(message.date)}>{formatMailDate(message.date)}</time>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
      <footer className="mailbox-pager">
        <button type="button" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}>Anterior</button>
        <span>Página {props.page} de {pages}</span>
        <button type="button" disabled={props.page >= pages} onClick={() => props.onPage(props.page + 1)}>Próxima</button>
        <button type="button" onClick={props.onLoadOlder}>Carregar mais antigas</button>
      </footer>
    </section>
  )
}

interface ScheduledListProps {
  drafts: MailDraft[]
  onOpen: (draft: MailDraft) => void
  onCancel: (draft: MailDraft) => void
}

export function MailboxScheduledList({ drafts, onOpen, onCancel }: ScheduledListProps) {
  return (
    <section className="mailbox-list" aria-label="Envios agendados">
      {drafts.length === 0 && <p className="mailbox-empty">Nenhum envio agendado.</p>}
      <ul>
        {drafts.map((draft) => (
          <li key={draft.id}>
            <article className="mailbox-row mailbox-row--scheduled">
              <CalendarClock size={16} />
              <button type="button" className="mailbox-row__main" onClick={() => onOpen(draft)}>
                <strong>{draft.to || '(sem destinatário)'}</strong>
                <span>{draft.subject || '(sem assunto)'}</span>
                <small>{draft.sending ? 'Enviando agora…' : `Envio em ${formatFullDate(draft.scheduledAt)}`}</small>
              </button>
              <div className="mailbox-row__meta">
                {!draft.sending && <button type="button" onClick={() => onCancel(draft)}>Cancelar</button>}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
