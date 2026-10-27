import { Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ComposerState } from './useMailbox'
import { RichTextEditor } from './RichTextEditor'
import { formatBytes } from './format'

interface MailboxComposerProps {
  composer: ComposerState
  onChange: (partial: Partial<ComposerState>) => void
  onClose: () => void
  onSend: () => void
  onDiscard: () => void
  onFiles: (files: FileList | null) => void
  onRemoveFile: (id: number) => void
}

export function MailboxComposer({ composer, onChange, onClose, onSend, onDiscard, onFiles, onRemoveFile }: MailboxComposerProps) {
  const title = composer.mode === 'forward' ? 'Encaminhar' : composer.mode === 'replyAll' ? 'Responder a todos' : composer.mode === 'reply' ? 'Responder' : 'Novo e-mail'
  return (
    <form
      className="mailbox-composer"
      onSubmit={(event) => {
        event.preventDefault()
        onSend()
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar editor"><X size={18} /></button>
      </header>
      <label>
        Para
        <input value={composer.to || ''} onChange={(event) => onChange({ to: event.target.value })} required />
      </label>
      {!composer.showCc ? (
        <button type="button" className="mailbox-link" onClick={() => onChange({ showCc: true })}>Adicionar Cc e Cco</button>
      ) : (
        <>
          <label>Cc<input value={composer.cc || ''} onChange={(event) => onChange({ cc: event.target.value })} /></label>
          <label>Cco<input value={composer.bcc || ''} onChange={(event) => onChange({ bcc: event.target.value })} /></label>
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
        <ul className="mailbox-files">
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
      <footer>
        <label className="mailbox-file">
          <Paperclip size={16} /> Anexar
          <input type="file" multiple onChange={(event) => { onFiles(event.target.files); event.target.value = '' }} />
        </label>
        <label className="mailbox-check">
          <input type="checkbox" checked={composer.includeSignature !== false} onChange={(event) => onChange({ includeSignature: event.target.checked })} />
          Incluir assinatura
        </label>
        <span className="mailbox-save-state">
          {composer.saving ? 'Salvando rascunho…' : composer.savedAt ? `Rascunho salvo às ${new Date(composer.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'O rascunho é salvo automaticamente'}
        </span>
        <Button type="button" variant="ghost" onClick={onDiscard}>Descartar</Button>
        <Button type="submit">Enviar</Button>
      </footer>
    </form>
  )
}
