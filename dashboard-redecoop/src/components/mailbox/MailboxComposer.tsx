import { useState } from 'react'
import { CalendarClock, ChevronDown, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { MailSignature } from '@/services/mailbox.service'
import type { ComposerState } from './useMailbox'
import { AddressInput } from './AddressInput'
import { RichTextEditor } from './RichTextEditor'
import { formatBytes, formatFullDate } from './format'

interface MailboxComposerProps {
  composer: ComposerState
  signatures: MailSignature[]
  onChange: (partial: Partial<ComposerState>) => void
  onClose: () => void
  onSend: (sendAt?: string) => void
  onDiscard: () => void
  onFiles: (files: FileList | File[] | null) => void
  onRemoveFile: (id: number) => void
}

function at(daysAhead: number, hour: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  date.setHours(hour, 0, 0, 0)
  return date
}

function nextMonday(hour: number) {
  const date = at(1, hour)
  while (date.getDay() !== 1) date.setDate(date.getDate() + 1)
  return date
}

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function MailboxComposer({ composer, signatures, onChange, onClose, onSend, onDiscard, onFiles, onRemoveFile }: MailboxComposerProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [custom, setCustom] = useState(() => toLocalInput(at(1, 8)))
  const title = composer.mode === 'forward' ? 'Encaminhar' : composer.mode === 'replyAll' ? 'Responder a todos' : composer.mode === 'reply' ? 'Responder' : 'Novo e-mail'
  const presets = [
    { label: 'Amanhã de manhã', date: at(1, 8) },
    { label: 'Amanhã à tarde', date: at(1, 13) },
    { label: 'Segunda de manhã', date: nextMonday(8) },
  ]

  return (
    <form
      className="mailbox-composer"
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault()
        onSend()
      }}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          onSend()
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDrop={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('.mailbox-editor__area')) return
        if (!event.dataTransfer.files.length) return
        event.preventDefault()
        onFiles(event.dataTransfer.files)
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar editor"><X size={18} /></button>
      </header>
      {composer.scheduledAt && (
        <p className="mailbox-banner">Agendado para {formatFullDate(composer.scheduledAt)}. Enviar de novo substitui o agendamento.</p>
      )}
      {composer.scheduleError && <p className="mailbox-banner mailbox-banner--bad">O envio anterior falhou: {composer.scheduleError}</p>}
      <AddressInput label="Para" value={composer.to || ''} onChange={(to) => onChange({ to })} autoFocus={!composer.to} />
      {!composer.showCc ? (
        <button type="button" className="mailbox-link" onClick={() => onChange({ showCc: true })}>Adicionar Cc e Cco</button>
      ) : (
        <>
          <AddressInput label="Cc" value={composer.cc || ''} onChange={(cc) => onChange({ cc })} />
          <AddressInput label="Cco" value={composer.bcc || ''} onChange={(bcc) => onChange({ bcc })} />
        </>
      )}
      <label>
        Assunto
        <input value={composer.subject || ''} onChange={(event) => onChange({ subject: event.target.value })} />
      </label>
      <RichTextEditor
        editorKey={composer.editorKey}
        initialHtml={composer.html || ''}
        onChange={(html) => onChange({ html })}
      />
      {composer.attachments.length > 0 && (
        <ul className="mailbox-files" aria-label="Anexos">
          {composer.attachments.map((file) => (
            <li key={file.id}>
              <Paperclip size={14} />
              <span>{file.filename}</span>
              <small>{formatBytes(file.size)}</small>
              <button type="button" onClick={() => onRemoveFile(file.id)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
      <div className="mailbox-composer__options">
        <label className="mailbox-check">
          <input type="checkbox" checked={composer.includeSignature !== false} onChange={(event) => onChange({ includeSignature: event.target.checked })} />
          Assinatura
        </label>
        {signatures.length > 1 && composer.includeSignature !== false && (
          <select aria-label="Escolher assinatura" value={composer.signatureId || signatures[0].id} onChange={(event) => onChange({ signatureId: event.target.value })}>
            {signatures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <label className="mailbox-inline-field">
          Prioridade
          <select value={composer.priority || 'normal'} onChange={(event) => onChange({ priority: event.target.value as ComposerState['priority'] })}>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="low">Baixa</option>
          </select>
        </label>
        <label className="mailbox-check">
          <input type="checkbox" checked={Boolean(composer.requestReceipt)} onChange={(event) => onChange({ requestReceipt: event.target.checked })} />
          Pedir confirmação de leitura
        </label>
      </div>
      <footer>
        <label className="mailbox-file">
          <Paperclip size={16} /> Anexar
          <input type="file" multiple onChange={(event) => { onFiles(event.target.files); event.target.value = '' }} />
        </label>
        <span className="mailbox-save-state">
          {composer.saving ? 'Salvando rascunho…' : composer.savedAt ? `Rascunho salvo às ${new Date(composer.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'O rascunho é salvo automaticamente'}
        </span>
        <Button type="button" variant="ghost" onClick={onDiscard}>Descartar</Button>
        <div className="mailbox-send">
          <Button type="submit">Enviar</Button>
          <button type="button" className="mailbox-send__more" aria-label="Agendar envio" aria-expanded={scheduleOpen} onClick={() => setScheduleOpen((value) => !value)}>
            <ChevronDown size={16} />
          </button>
          {scheduleOpen && (
            <div className="mailbox-schedule" role="dialog" aria-label="Agendar envio">
              <strong><CalendarClock size={15} /> Agendar envio</strong>
              {presets.map((preset) => (
                <button key={preset.label} type="button" onClick={() => { setScheduleOpen(false); onSend(preset.date.toISOString()) }}>
                  {preset.label}
                  <small>{preset.date.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                </button>
              ))}
              <label>
                Data e hora
                <input type="datetime-local" value={custom} min={toLocalInput(new Date())} onChange={(event) => setCustom(event.target.value)} />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const date = new Date(custom)
                  if (Number.isNaN(date.getTime())) return
                  setScheduleOpen(false)
                  onSend(date.toISOString())
                }}
              >
                Agendar
              </Button>
            </div>
          )}
        </div>
      </footer>
    </form>
  )
}
