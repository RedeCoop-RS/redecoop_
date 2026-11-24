import { AlertCircle, ArrowDown, CalendarClock, ChevronLeft, ChevronRight, FileText, Flag, Forward, Mail, MailOpen, Paperclip, Trash2 } from 'lucide-react'
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
  onSeen: (message: MailListItem, seen: boolean) => void
  onForward: (message: MailListItem) => void
  onDelete: (message: MailListItem) => void
  onOpenDrafts: () => void
  emptyHint?: string
  onPage: (page: number) => void
  onDraft: (draft: MailDraft) => void
  onLoadOlder: () => void
}

export function MailboxList(props: MailboxListProps) {
  const { messages, selected } = props
  const pages = Math.max(1, Math.ceil(props.total / 30))
  const unsent = props.drafts.filter((draft) => !draft.scheduledAt)

  return (
    <section className="mailbox-list" aria-label="Mensagens">
      {unsent.length > 0 && (
        <button type="button" className="mailbox-draft-strip" onClick={props.onOpenDrafts}>
          {unsent.some((draft) => draft.scheduleError) ? <AlertCircle size={14} /> : null}
          <span>{unsent.length === 1 ? '1 rascunho' : `${unsent.length} rascunhos`}</span>
          <small>{unsent[0].subject || unsent[0].to || 'sem assunto'}</small>
        </button>
      )}
      {props.loading && <p className="mailbox-empty">Carregando mensagens…</p>}
      {!props.loading && messages.length === 0 && (
        <div className="mailbox-hero-empty">
          <strong>Nada por aqui</strong>
          <p>{props.emptyHint || 'Esta pasta está vazia, ou o filtro atual não encontrou mensagens.'}</p>
        </div>
      )}
      <ul>
        {messages.map((message) => {
          const unread = props.threads ? (message.threadUnread ?? (message.seen ? 0 : 1)) > 0 : !message.seen
          const who = displayAddress({ name: message.fromName, address: message.fromAddress }) || '(sem remetente)'
          return (
            <li key={message.uid}>
              <article
                className={`mailbox-row mailbox-row--message ${unread ? 'mailbox-row--unread' : ''} ${props.activeUid === message.uid ? 'mailbox-row--active' : ''} ${selected.includes(message.uid) ? 'mailbox-row--selected' : ''}`}
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
                <button type="button" className={`mailbox-row__star ${message.flagged ? 'is-on' : ''}`} aria-pressed={message.flagged} aria-label={message.flagged ? 'Remover sinalização' : 'Sinalizar'} title={message.flagged ? 'Sinalizada' : 'Sinalizar'} onClick={() => props.onStar(message)}>
                  <Flag size={16} fill={message.flagged ? 'currentColor' : 'none'} />
                </button>
                <button type="button" className="mailbox-row__main" onClick={() => props.onOpen(message)}>
                  <span className="mailbox-row__who">
                    <strong>
                      {unread && <i className="mailbox-unread-dot" title="Não lida" />}
                      {message.priority === 'high' && <span className="mailbox-priority" title="Prioridade alta" aria-label="Prioridade alta">!</span>}
                      {message.priority === 'low' && <ArrowDown size={12} aria-label="Prioridade baixa" />}
                      {who}
                      {props.threads && (message.threadCount || 1) > 1 && <span className="mailbox-thread-count" aria-label={`${message.threadCount} mensagens na conversa`}>{message.threadCount}</span>}
                    </strong>
                    <time dateTime={message.date || undefined} title={formatFullDate(message.date)}>{formatMailDate(message.date)}</time>
                  </span>
                  <span className="mailbox-row__subject">
                    <b>{message.subject || '(sem assunto)'}</b>
                    {message.hasAttachments && <Paperclip size={13} aria-label="Possui anexo" />}
                    {message.snippet && <small>{message.snippet}</small>}
                  </span>
                </button>
                <div className="mailbox-row__tools">
                  <button type="button" aria-label={unread ? 'Marcar como lida' : 'Marcar como não lida'} title={unread ? 'Marcar como lida' : 'Marcar como não lida'} onClick={() => props.onSeen(message, unread)}>
                    {unread ? <MailOpen size={15} /> : <Mail size={15} />}
                  </button>
                  <button type="button" aria-label="Encaminhar" title="Encaminhar" onClick={() => props.onForward(message)}>
                    <Forward size={15} />
                  </button>
                  <button type="button" aria-label="Excluir" title="Excluir" onClick={() => props.onDelete(message)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
      <footer className="mailbox-pager">
        <div className="mailbox-pager__nav">
          <button type="button" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}>
            <ChevronLeft size={15} /> Anterior
          </button>
          <span>Página {props.page} de {pages}</span>
          <button type="button" disabled={props.page >= pages} onClick={() => props.onPage(props.page + 1)}>
            Próxima <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </section>
  )
}

interface ScheduledListProps {
  drafts: MailDraft[]
  onOpen: (draft: MailDraft) => void
  onCancel: (draft: MailDraft) => void
}

interface DraftListProps {
  drafts: MailDraft[]
  onOpen: (draft: MailDraft) => void
  onDelete: (draft: MailDraft) => void
}

export function MailboxDraftList({ drafts, onOpen, onDelete }: DraftListProps) {
  const local = drafts.filter((draft) => !draft.scheduledAt)
  return (
    <section className="mailbox-list mailbox-draft-view" aria-label="Rascunhos">
      <header className="mailbox-draft-view__head">
        <strong>Rascunhos</strong>
        <span>{local.length === 1 ? '1 salvo neste painel' : `${local.length} salvos neste painel`}</span>
      </header>
      {local.length === 0 && (
        <div className="mailbox-hero-empty">
          <strong>Nenhum rascunho</strong>
          <p>O que você começa a escrever fica aqui, com Para, Cc, Cco, assunto e anexos.</p>
        </div>
      )}
      <ul className="mailbox-drafts-list">
        {local.map((draft) => (
          <li key={draft.id}>
            <button type="button" className="mailbox-draft-card" onClick={() => onOpen(draft)}>
              <span className="mailbox-draft-card__mark" aria-hidden="true"><FileText size={16} /></span>
              <span className="mailbox-draft-card__meta">
                <strong>{draft.subject || '(sem assunto)'}</strong>
                <span>Para {draft.to || 'sem destinatário'}</span>
                {draft.cc ? <span>Cc {draft.cc}</span> : null}
                {draft.bcc ? <span>Cco {draft.bcc}</span> : null}
                {draft.scheduleError ? <small>{draft.scheduleError}</small> : null}
              </span>
            </button>
            <button type="button" className="mailbox-draft-card__delete" onClick={() => onDelete(draft)}>
              <Trash2 size={14} /> Excluir
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
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
