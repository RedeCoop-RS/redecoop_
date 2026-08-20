import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { conversationService } from '@/services/product.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChatMessageModal } from '@/components/modals/BusinessModals'
import { DirectMessageModal } from '@/components/modals/CooperativeModals'
import { formatBusinessDate } from '@/lib/business'
import { useAuth } from '@/contexts/AuthContext'
import type { Conversation } from '@/types'

function getContactLabel(conversation: Conversation, userCoopId?: number) {
  const other =
    userCoopId && conversation.initiatorCooperative?.id === userCoopId
      ? conversation.participantCooperative
      : conversation.initiatorCooperative ?? conversation.participantCooperative

  return other?.companyName ?? other?.fantasyName ?? '—'
}

export function MessagesPage() {
  const { user } = useAuth()
  const userCoopId = user?.cooperative?.id

  const [rows, setRows] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [notReadCount, setNotReadCount] = useState(0)
  const [filterCoop, setFilterCoop] = useState('')
  const [contacts, setContacts] = useState<{ id: number; companyName?: string; fantasyName?: string }[]>([])

  const [viewId, setViewId] = useState<number | null>(null)
  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const conversationParam = searchParams.get('conversation')

  useEffect(() => {
    conversationService.recentContacts().then(setContacts)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await conversationService.list(page, 15, filterCoop || undefined)
      setRows(result.data)
      setTotal(result.meta.totalItems ?? result.data.length)
      setNotReadCount(result.totalUnreadMessages)
    } catch {
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, filterCoop])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const id = Number(conversationParam)
    if (!Number.isFinite(id) || id <= 0) return
    setViewId(id)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('conversation')
        return next
      },
      { replace: true },
    )
  }, [conversationParam, setSearchParams])

  return (
    <div className="messages-page">
      <PageHeader title="Mensagens" description="Conversas entre cooperativas e administração." />

      <div className="messages-filters">
        <Select
          label="Contato"
          value={filterCoop}
          onChange={(e) => {
            setFilterCoop(e.target.value)
            setPage(1)
          }}
          placeholder="Todos"
          options={contacts.map((c) => ({
            value: c.id,
            label: c.companyName ?? c.fantasyName ?? `Cooperativa #${c.id}`,
          }))}
        />
      </div>

      <div className="messages-stats">
        <div className="business-stat">
          <p className="business-stat__label">Mensagens não lidas</p>
          <p className="business-stat__value">{notReadCount}</p>
        </div>
        <div className="business-stat">
          <p className="business-stat__label">Conversas ativas</p>
          <p className="business-stat__value">{total}</p>
        </div>
        <Button onClick={() => setNewMessageOpen(true)}>
          <Plus size={16} />
          Nova Conversa
        </Button>
      </div>

      <div className="business-table-card dashboard-scroll">
        <table className="business-table table-cards-mobile">
          <thead>
            <tr>
              <th>Id</th>
              <th>Último contato</th>
              <th>Contato</th>
              <th>Título</th>
              <th>Visto?</th>
              <th>Mensagens</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j}>
                      <span className="coops-skeleton" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="Nenhum registro encontrado" />
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => {
                const unread = (row.totalMessagesNotSeenByMe ?? 0) > 0
                return (
                  <tr key={row.id}>
                    <td data-label="Id">
                      <button type="button" className="business-link" onClick={() => setViewId(row.id)}>
                        {row.id}
                      </button>
                    </td>
                    <td data-label="Último contato">{row.lastMessage ? formatBusinessDate(row.lastMessage) : '—'}</td>
                    <td data-label="Contato">{getContactLabel(row, userCoopId)}</td>
                    <td data-label="Título">{row.title ?? '—'}</td>
                    <td data-label="Visto?">
                      {row.messageCount
                        ? (row.totalMessagesNotSeenByMe ?? 0) > 0
                          ? 'Não'
                          : 'Sim'
                        : '—'}
                    </td>
                    <td data-label="Mensagens" className={unread ? 'business-messages--alert' : ''}>
                      {unread && <span className="business-messages__dot" aria-hidden />}
                      {row.messageCount ?? 0}
                      {(row.messageCount ?? 0) > 0 && (
                        <>
                          {' - '}
                          <button type="button" className="business-messages__btn" onClick={() => setViewId(row.id)}>
                            Ver
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={15} onPageChange={setPage} />

      <ChatMessageModal
        open={!!viewId}
        title={`Conversa #${viewId ?? ''}`}
        conversationId={viewId}
        onClose={() => {
          setViewId(null)
          load()
        }}
      />
      <DirectMessageModal
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onStarted={(id) => {
          setViewId(id)
          load()
        }}
      />
    </div>
  )
}
