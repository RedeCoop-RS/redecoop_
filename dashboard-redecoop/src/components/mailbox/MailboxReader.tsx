import { Archive, ChevronLeft, Forward, ImageOff, Paperclip, Reply, ReplyAll, RotateCcw, ShieldAlert, Star, Trash2 } from 'lucide-react'
import type { MailFolder, MailMessage } from '@/services/mailbox.service'
import { displayAddress, folderLabel, formatAddress, formatBytes, formatFullDate } from './format'

interface MailboxReaderProps {
  message: MailMessage | null
  reading: boolean
  folders: MailFolder[]
  onBack: () => void
  onReply: (all?: boolean) => void
  onForward: () => void
  onArchive: () => void
  onSpam: () => void
  onDelete: () => void
  onRestore: () => void
  onStar: () => void
  onUnread: () => void
  onMove: (folder: string) => void
  onLoadImages: () => void
  onOpenThread: (folder: string, uid: number) => void
  onAttachment: (index: number, filename: string, contentType: string, preview: boolean) => void
}

export function MailboxReader(props: MailboxReaderProps) {
  const { message } = props
  if (props.reading) return <section className="mailbox-reader"><p className="mailbox-empty">Abrindo mensagem…</p></section>
  if (!message) {
    return (
      <section className="mailbox-reader">
        <p className="mailbox-empty">Selecione uma mensagem para ler.</p>
      </section>
    )
  }

  const html = message.html
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
        body{margin:0;padding:8px 2px 24px;font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.55;color:#1a1a2e;overflow-wrap:anywhere}
        img,video{max-width:100%;height:auto} a{color:#007a35} blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #92d0b2;color:#4b5563}
        table{max-width:100%}
      </style></head><body>${message.html}</body></html>`
    : ''

  return (
    <section className="mailbox-reader">
      <header className="mailbox-reader__bar">
        <button type="button" className="mailbox-back" onClick={props.onBack} aria-label="Voltar para a lista">
          <ChevronLeft size={18} />
        </button>
        <button type="button" onClick={() => props.onReply(false)}><Reply size={16} /> Responder</button>
        <button type="button" onClick={() => props.onReply(true)}><ReplyAll size={16} /> Responder a todos</button>
        <button type="button" onClick={props.onForward}><Forward size={16} /> Encaminhar</button>
        <button type="button" onClick={props.onArchive}><Archive size={16} /> Arquivar</button>
        {props.folders.some((folder) => folder.specialUse === 'spam') && (
          <button type="button" onClick={props.onSpam}><ShieldAlert size={16} /> Spam</button>
        )}
        {message.specialUse === 'trash' && (
          <button type="button" onClick={props.onRestore}><RotateCcw size={16} /> Restaurar</button>
        )}
        <button type="button" onClick={props.onDelete}><Trash2 size={16} /> Excluir</button>
        <button type="button" onClick={props.onStar}><Star size={16} /> {message.flagged ? 'Com estrela' : 'Estrela'}</button>
        <button type="button" onClick={props.onUnread}>Não lida</button>
        <label className="mailbox-move">
          Mover
          <select defaultValue="" onChange={(event) => { if (event.target.value) props.onMove(event.target.value); event.target.value = '' }}>
            <option value="">Pasta…</option>
            {props.folders.filter((folder) => folder.selectable && folder.path !== message.folder).map((folder) => (
              <option key={folder.path} value={folder.path}>{folderLabel(folder)}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="mailbox-reader__body">
        <h2>{message.subject || '(sem assunto)'}</h2>
        <p className="mailbox-reader__from">
          <strong>{displayAddress(message.from) || 'Remetente desconhecido'}</strong>
          <span>{message.from?.address}</span>
          <time>{formatFullDate(message.date)}</time>
        </p>
        <p className="mailbox-reader__people">Para: {(message.to || []).map(formatAddress).join(', ') || '—'}</p>
        {message.cc.length > 0 && <p className="mailbox-reader__people">Cc: {message.cc.map(formatAddress).join(', ')}</p>}

        {message.remoteImagesBlocked && (
          <div className="mailbox-images">
            <ImageOff size={16} />
            <span>Imagens remotas bloqueadas ({message.remoteImageCount}).</span>
            <button type="button" onClick={props.onLoadImages}>Carregar imagens</button>
          </div>
        )}

        {html ? (
          <iframe
            title="Conteúdo do e-mail"
            className="mailbox-frame"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            srcDoc={html}
            onLoad={(event) => {
              const frame = event.currentTarget
              const height = frame.contentDocument?.documentElement.scrollHeight || 240
              frame.style.height = `${Math.min(Math.max(height, 180), 5000)}px`
            }}
          />
        ) : (
          <pre className="mailbox-text">{message.text || 'Esta mensagem não tem conteúdo.'}</pre>
        )}

        {message.attachments.length > 0 && (
          <ul className="mailbox-files">
            {message.attachments.map((file) => (
              <li key={file.index}>
                <Paperclip size={14} />
                <span>{file.filename}</span>
                <small>{formatBytes(file.size)}</small>
                {(file.contentType.startsWith('image/') || file.contentType === 'application/pdf') && (
                  <button type="button" onClick={() => props.onAttachment(file.index, file.filename, file.contentType, true)}>Ver</button>
                )}
                <button type="button" onClick={() => props.onAttachment(file.index, file.filename, file.contentType, false)}>Baixar</button>
              </li>
            ))}
          </ul>
        )}

        {message.thread.length > 1 && (
          <div className="mailbox-thread">
            <h3>Conversa</h3>
            {message.thread.map((item) => (
              <button
                key={`${item.folder}-${item.uid}`}
                type="button"
                className={item.uid === message.uid && item.folder === message.folder ? 'is-current' : ''}
                onClick={() => item.folder && props.onOpenThread(item.folder, item.uid)}
              >
                <strong>{item.fromName || item.fromAddress || 'Mensagem'}</strong>
                <span>{item.subject}</span>
                <time>{formatFullDate(item.date)}</time>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
