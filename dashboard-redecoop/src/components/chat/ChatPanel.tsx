import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Edit2, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { chatService, socketService } from '@/services/socket.service'
import { conversationService } from '@/services/product.service'
import { environment } from '@/config/environment'
import { BusinessStatus, MessageStatus, UserRole, type Conversation, type ConversationMessage } from '@/types'
import { Button } from '@/components/ui/Button'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { formatMessageHtml, isPendingPlaceholder, messageToPlainText } from '@/lib/message'

interface ChatPanelProps {
  conversationId: number
  showCooperativeName?: boolean
  header?: ReactNode
  footer?: ReactNode
  onClose?: () => void
}

function messageStatusLabel(status: MessageStatus) {
  switch (status) {
    case MessageStatus.Pending:
      return 'Aguardando intermediação'
    case MessageStatus.Rejected:
      return 'Reprovada'
    default:
      return null
  }
}

export function ChatPanel({
  conversationId,
  showCooperativeName = true,
  header,
  footer,
}: ChatPanelProps) {
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const blockNewMessages =
    conversation?.business &&
    conversation.business.status !== BusinessStatus.Negotiating &&
    conversation.business.status !== BusinessStatus.Confirmed

  const load = async (reconnect = false) => {
    if (!reconnect) setLoading(true)
    try {
      const data = await conversationService.view(conversationId)
      setConversation(data)
      setMessages(data.messages ?? [])
      chatService.joinConversation(conversationId)
    } catch {
      toast.error('Erro ao carregar conversa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    load()

    const unsubNew = chatService.onNewMessage((data) => {
      const msg = data as ConversationMessage & { conversationId?: number }
      if (!msg) return
      if (msg.conversationId != null && msg.conversationId !== conversationId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    const unsubApproved = chatService.onMessageApproved((data) => {
      const d = data as { messageId: number; status: MessageStatus; content: string }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === d.messageId ? { ...m, status: d.status, content: d.content } : m,
        ),
      )
    })

    const unsubEdited = chatService.onMessageEdited((data) => {
      const d = data as { messageId: number; newContent: string; status: MessageStatus }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === d.messageId ? { ...m, content: d.newContent, status: d.status } : m,
        ),
      )
    })

    const unsubReconnect = socketService.onConnect(() => {
      if (active) load(true)
    })

    return () => {
      active = false
      chatService.leaveConversation(conversationId)
      unsubNew()
      unsubApproved()
      unsubEdited()
      unsubReconnect()
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || loading || messages.length === 0) return

    const markVisibleAsRead = (messageId: number) => {
      const msg = messages.find((item) => item.id === messageId)
      if (!msg || msg.seen) return
      if (msg.isSender ?? msg.sender) return
      if (msg.status !== MessageStatus.Approved) return

      chatService.markAsRead(messageId)
      setMessages((prev) =>
        prev.map((item) => (item.id === messageId ? { ...item, seen: true } : item)),
      )
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const messageId = Number(entry.target.getAttribute('data-message-id'))
          if (Number.isFinite(messageId)) markVisibleAsRead(messageId)
        })
      },
      { root: container, threshold: 0.6 },
    )

    const observeMessages = () => {
      container.querySelectorAll('[data-message-id]').forEach((node) => observer.observe(node))
    }

    observeMessages()
    const mutationObserver = new MutationObserver(observeMessages)
    mutationObserver.observe(container, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [loading, messages])

  const send = () => {
    if (!text.trim() || blockNewMessages) return
    if (editingId) {
      chatService.editMessage(editingId, conversationId, text.trim())
      setEditingId(null)
    } else {
      chatService.sendMessage(text.trim(), conversationId)
    }
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const startEdit = (msg: ConversationMessage) => {
    setEditingId(msg.id)
    setText(messageToPlainText(msg.content))
    textareaRef.current?.focus()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setText('')
  }

  const approve = (messageId: number, approved: boolean) => {
    if (approved) chatService.markAsApproved(messageId, conversationId, true)
    else chatService.markAsReproved(messageId, conversationId)
  }

  const autoResizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  if (loading) return <LoadingOverlay visible inline message="Carregando conversa..." />

  return (
    <div className="chat-panel">
      {header && <div className="chat-panel__header">{header}</div>}

      <div className="chat-panel__messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <p className="chat-panel__empty">Nenhuma mensagem ainda. Inicie a conversa abaixo.</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.isSender ?? msg.sender
            const isPending = msg.status === MessageStatus.Pending
            const isRejected = msg.status === MessageStatus.Rejected
            const isAdmin = user?.role === UserRole.ADMIN
            const isMaskedPending = isPending && !isMine && !isAdmin && isPendingPlaceholder(msg.content)
            const statusLabel = isMaskedPending ? null : messageStatusLabel(msg.status)

            return (
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={`chat-message-row${isMine ? ' chat-message-row--mine' : ''}${isMaskedPending ? ' chat-message-row--masked' : ''}`}
              >
                <div
                  className={[
                    'chat-bubble',
                    isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs',
                    isMaskedPending ? 'chat-bubble--masked' : '',
                    isPending && !isMaskedPending ? 'chat-bubble--pending' : '',
                    isRejected ? 'chat-bubble--rejected' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {showCooperativeName && !isMine && msg.cooperative?.name && !isMaskedPending && (
                    <p className="chat-bubble__author">
                      {msg.cooperative.companyName ?? msg.cooperative.fantasyName ?? msg.cooperative.name}
                    </p>
                  )}
                  {isMaskedPending ? (
                    <div className="chat-bubble__masked">
                      <span className="chat-bubble__masked-icon" aria-hidden>⏳</span>
                      <div
                        className="chat-bubble__content"
                        dangerouslySetInnerHTML={{ __html: formatMessageHtml(msg.content) }}
                      />
                    </div>
                  ) : (
                    <div
                      className="chat-bubble__content"
                      dangerouslySetInnerHTML={{ __html: formatMessageHtml(msg.content) }}
                    />
                  )}
                  <div className="chat-bubble__meta">
                    <span>{new Date(msg.createdAt).toLocaleString('pt-BR')}</span>
                    {statusLabel && (
                      <span className={`chat-bubble__status chat-bubble__status--${msg.status}`}>
                        {statusLabel}
                      </span>
                    )}
                    {isMine && msg.status !== MessageStatus.Approved && !isPending && (
                      <button type="button" className="chat-bubble__edit" onClick={() => startEdit(msg)} aria-label="Editar">
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {isPending && isAdmin && (
                  <div className="chat-message-side">
                    <div className="chat-admin-actions">
                      <button type="button" className="chat-admin-actions__btn chat-admin-actions__btn--reject" onClick={() => approve(msg.id, false)} aria-label="Reprovar">
                        <X size={14} />
                      </button>
                      <button type="button" className="chat-admin-actions__btn chat-admin-actions__btn--approve" onClick={() => approve(msg.id, true)} aria-label="Aprovar">
                        <Check size={14} />
                      </button>
                      <button type="button" className="chat-admin-actions__btn chat-admin-actions__btn--edit" onClick={() => startEdit(msg)} aria-label="Editar">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {footer && <div className="chat-panel__footer">{footer}</div>}

      {!blockNewMessages ? (
        <div className="chat-panel__composer">
          {editingId && (
            <div className="chat-panel__editing">
              <span>Editando mensagem</span>
              <button type="button" onClick={cancelEdit}>Cancelar</button>
            </div>
          )}
          <div className="chat-panel__composer-row">
            <textarea
              ref={textareaRef}
              className="chat-panel__input"
              rows={2}
              placeholder={editingId ? 'Editar mensagem...' : 'Digite sua mensagem...'}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                autoResizeTextarea()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <Button className="chat-panel__send" onClick={send} disabled={!text.trim()}>
              <Send size={16} />
              {editingId ? 'Salvar' : 'Enviar'}
            </Button>
          </div>
          <p className="chat-panel__hint">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      ) : (
        <div className="chat-panel__blocked">
          Negociação encerrada — envio de mensagens bloqueado.
        </div>
      )}
    </div>
  )
}

export function CooperativeAvatar({ picture, name }: { picture?: string; name?: string }) {
  const src = picture ? `${environment.storageUrl}${picture}` : '/assets/imgs/default-cooperative.png'
  return (
    <img src={src} alt={name ?? ''} className="chat-cooperative-avatar" />
  )
}
