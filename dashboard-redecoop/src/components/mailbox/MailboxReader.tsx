import { useState } from 'react'
import {
  ChevronLeft,
  Code2,
  Forward,
  ImageOff,
  Inbox,
  Mail,
  MailCheck,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  Printer,
  Reply,
  ReplyAll,
  RotateCcw,
  ShieldAlert,
  Flag,
  Download,
  Eye,
  Trash2,
} from 'lucide-react'
import type { MailFolder, MailMessage } from '@/services/mailbox.service'
import { displayAddress, folderLabel, formatAddress, formatBytes, formatFullDate } from './format'

interface MailboxReaderProps {
  message: MailMessage | null
  reading: boolean
  folders: MailFolder[]
  onBack: () => void
  onReply: (all?: boolean) => void
  onForward: (asAttachment?: boolean) => void
  onSpam: () => void
  onNotSpam: () => void
  onDelete: () => void
  onRestore: () => void
  onStar: () => void
  onUnread: () => void
  onRead: () => void
  onMove: (folder: string) => void
  onLoadImages: () => void
  onOpenThread: (folder: string, uid: number) => void
  onAttachment: (index: number, filename: string, contentType: string, preview: boolean) => void
  onPrint: () => void
  onSource: () => void
  onUnsubscribe: () => void
  onReceipt: (send: boolean) => void
}

const PREVIEWABLE = /^(image\/(png|jpe?g|gif|webp|bmp)|application\/pdf|text\/plain)$/i

export function MailboxReader(props: MailboxReaderProps) {
  const { message } = props
  const [moreOpen, setMoreOpen] = useState(false)
  if (props.reading) return <section className="mailbox-reader"><p className="mailbox-empty">Abrindo mensagem…</p></section>
  if (!message) {
    return (
      <section className="mailbox-reader">
        <div className="mailbox-hero-empty">
          <span className="mailbox-hero-empty__mark" aria-hidden="true"><Mail size={22} /></span>
          <strong>Escolha uma mensagem</strong>
          <p>A leitura abre aqui. Atalho <kbd>?</kbd> mostra os comandos da caixa.</p>
        </div>
      </section>
    )
  }

  const html = message.html
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid: https: http:; style-src 'unsafe-inline'">
      <style>
        body{margin:0;padding:8px 2px 24px;font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.55;color:#1a1a2e;overflow-wrap:anywhere}
        img,video{max-width:100%;height:auto} a{color:#007a35} blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #92d0b2;color:#4b5563}
        table{max-width:100%}
      </style></head><body>${message.html}</body></html>`
    : ''
  const inSpam = message.specialUse === 'spam'
  const inTrash = message.specialUse === 'trash'
  const hasSpam = props.folders.some((folder) => folder.specialUse === 'spam')
  const files = message.attachments.filter((file) => !file.related || !file.contentId)

  return (
    <section className="mailbox-reader" aria-label="Mensagem">
      <header className="mailbox-readbar">
        <div className="mailbox-readbar__group">
          <button type="button" className="mailbox-tool" onClick={props.onBack} aria-label="Voltar para a lista" title="Voltar">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="mailbox-tool mailbox-tool--text" onClick={() => props.onReply(false)}><Reply size={15} /> Responder</button>
          <button type="button" className="mailbox-tool mailbox-tool--text" onClick={() => props.onReply(true)}><ReplyAll size={15} /> A todos</button>
          <button type="button" className="mailbox-tool mailbox-tool--text" onClick={() => props.onForward(false)}><Forward size={15} /> Encaminhar</button>
        </div>
        <div className="mailbox-readbar__group">
          <button type="button" className="mailbox-tool" onClick={props.onDelete} title={inTrash ? 'Excluir de vez' : 'Excluir'} aria-label={inTrash ? 'Excluir de vez' : 'Excluir'}><Trash2 size={16} /></button>
          <button type="button" className={`mailbox-tool ${message.flagged ? 'is-star' : ''}`} aria-pressed={message.flagged} onClick={props.onStar} title={message.flagged ? 'Sinalizada' : 'Sinalizar'} aria-label={message.flagged ? 'Remover sinalização' : 'Sinalizar'}><Flag size={16} fill={message.flagged ? 'currentColor' : 'none'} /></button>
          <button type="button" className="mailbox-tool" onClick={() => (message.seen ? props.onUnread() : props.onRead())} title={message.seen ? 'Marcar como não lida' : 'Marcar como lida'} aria-label={message.seen ? 'Marcar como não lida' : 'Marcar como lida'}>{message.seen ? <Mail size={16} /> : <MailOpen size={16} />}</button>
          {hasSpam && !inSpam && <button type="button" className="mailbox-tool" onClick={props.onSpam} title="Spam" aria-label="Spam"><ShieldAlert size={16} /></button>}
          {inSpam && <button type="button" className="mailbox-tool" onClick={props.onNotSpam} title="Não é spam" aria-label="Não é spam"><Inbox size={16} /></button>}
          {inTrash && <button type="button" className="mailbox-tool" onClick={props.onRestore} title="Restaurar" aria-label="Restaurar"><RotateCcw size={16} /></button>}
          <select className="mailbox-readbar__move" defaultValue="" aria-label="Mover para a pasta" onChange={(event) => { if (event.target.value) props.onMove(event.target.value); event.target.value = '' }}>
            <option value="">Mover</option>
            {props.folders.filter((folder) => folder.selectable && folder.path !== message.folder).map((folder) => (
              <option key={folder.path} value={folder.path}>{folderLabel(folder)}</option>
            ))}
          </select>
          <div className="mailbox-more">
            <button type="button" className="mailbox-tool" aria-label="Mais ações" title="Mais ações" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal size={16} /></button>
            {moreOpen && (
              <div className="mailbox-more__menu" role="menu" onClick={() => setMoreOpen(false)}>
                <button type="button" role="menuitem" onClick={() => props.onForward(true)}><Forward size={15} /> Encaminhar como anexo</button>
                <button type="button" role="menuitem" onClick={props.onPrint}><Printer size={15} /> Imprimir</button>
                <button type="button" role="menuitem" onClick={props.onSource}><Code2 size={15} /> Ver original</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mailbox-reader__body">
        <h2>
          {!message.seen && <span className="mailbox-status is-unread">Não lida</span>}
          {message.flagged && <span className="mailbox-tag mailbox-tag--star">Sinalizada</span>}
          {message.priority === 'high' && <span className="mailbox-tag mailbox-tag--high">Prioridade alta</span>}
          {message.priority === 'low' && <span className="mailbox-tag">Prioridade baixa</span>}
          {message.subject || '(sem assunto)'}
        </h2>
        <p className="mailbox-reader__from">
          <strong>{displayAddress(message.from) || 'Remetente desconhecido'}</strong>
          <span>{message.from?.address}</span>
          <time>{formatFullDate(message.date)}</time>
        </p>
        <p className="mailbox-reader__people"><b>Para</b> {(message.to || []).map(formatAddress).join(', ') || '—'}</p>
        {message.cc.length > 0 && <p className="mailbox-reader__people"><b>Cc</b> {message.cc.map(formatAddress).join(', ')}</p>}
        {message.listUnsubscribe && (
          <p className="mailbox-reader__people">
            Lista de e-mails. <button type="button" className="mailbox-link" onClick={props.onUnsubscribe}>Cancelar inscrição</button>
          </p>
        )}

        {message.receiptRequested && (
          <div className="mailbox-images mailbox-receipt" role="status">
            <MailCheck size={16} />
            <span>{message.receiptTo} pediu confirmação de leitura.</span>
            <button type="button" onClick={() => props.onReceipt(true)}>Enviar confirmação</button>
            <button type="button" onClick={() => props.onReceipt(false)}>Ignorar</button>
          </div>
        )}

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

        {files.length > 0 && (
          <section className="mailbox-attach" aria-label="Anexos">
            <header>
              <Paperclip size={14} />
              <span>{files.length === 1 ? '1 anexo' : `${files.length} anexos`}</span>
            </header>
            <ul>
              {files.map((file) => (
                <li key={file.index}>
                  <span className="mailbox-attach__mark" aria-hidden="true"><Paperclip size={16} /></span>
                  <span className="mailbox-attach__meta">
                    <strong>{file.filename}</strong>
                    <small>{formatBytes(file.size)}</small>
                  </span>
                  <span className="mailbox-attach__actions">
                    {PREVIEWABLE.test(file.contentType) && (
                      <button type="button" onClick={() => props.onAttachment(file.index, file.filename, file.contentType, true)}><Eye size={14} /> Ver</button>
                    )}
                    <button type="button" onClick={() => props.onAttachment(file.index, file.filename, file.contentType, false)}><Download size={14} /> Baixar</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {message.thread.length > 1 && (
          <div className="mailbox-thread">
            <h3>Conversa ({message.thread.length})</h3>
            {message.thread.map((item) => (
              <button
                key={`${item.folder}-${item.uid}`}
                type="button"
                className={item.uid === message.uid && item.folder === message.folder ? 'is-current' : ''}
                onClick={() => item.folder && props.onOpenThread(item.folder, item.uid)}
              >
                <strong>{item.fromName || item.fromAddress || 'Mensagem'}</strong>
                <span>{item.snippet || item.subject}</span>
                <small>{item.folderName}</small>
                <time>{formatFullDate(item.date)}</time>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
