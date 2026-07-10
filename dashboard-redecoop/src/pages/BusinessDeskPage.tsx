import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal, Share2, Trash2 } from 'lucide-react'
import { businessDeskService } from '@/services/business.service'
import {
  BusinessDeskModal,
  StartBusinessDeskModal,
} from '@/components/modals/OpportunityModals'
import {
  OpportunityAdminFilters,
  buildOpportunityDateFilter,
} from '@/components/opportunity/OpportunityFilters'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import { formatKg } from '@/lib/kg'
import { hasNextPage, nextPage, type PageMeta } from '@/lib/pagination'
import type { BusinessDeskItem } from '@/types'

function CardMenu({
  card,
  admin,
  userCoopId,
  onShare,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  card: BusinessDeskItem
  admin: boolean
  userCoopId?: number
  onShare: () => void
  onEdit?: () => void
  onToggleStatus?: () => void
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(false)
  const canManage =
    (admin || userCoopId === card.cooperativeId || userCoopId === card.cooperative?.id) &&
    !card.deletedAt

  return (
    <div className="opportunity-card__menu">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Mais ações">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <>
          <div className="opportunity-card__menu-backdrop" onClick={() => setOpen(false)} />
          <div className="opportunity-card__menu-list">
            <button type="button" onClick={() => { setOpen(false); onShare() }}>
              <Share2 size={14} />
              Compartilhar
            </button>
            {canManage && onEdit && (
              <button type="button" onClick={() => { setOpen(false); onEdit() }}>
                Editar
              </button>
            )}
            {canManage && onToggleStatus && (
              <button type="button" onClick={() => { setOpen(false); onToggleStatus() }}>
                {card.active ? 'Inativar' : 'Ativar'}
              </button>
            )}
            {admin && !card.deletedAt && onDelete && (
              <button type="button" className="text-red" onClick={() => { setOpen(false); onDelete() }}>
                <Trash2 size={14} />
                Excluir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function BusinessDeskPage() {
  const { isAdmin, isCooperative, user } = useAuth()
  const userCoopId = user?.cooperative?.id
  const { confirm } = useModal()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState<BusinessDeskItem[]>([])
  const [meta, setMeta] = useState<PageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterShowInactive, setFilterShowInactive] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<{ createdAtBetween?: string; showInactive?: boolean }>({})

  const [editId, setEditId] = useState<number | null | undefined>(undefined)
  const [startId, setStartId] = useState<number | null>(null)

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      if (page === 1) setLoading(true)
      else setLoadingMore(true)
      try {
        const result = await businessDeskService.list(page, 20, appliedFilters)
        setItems((prev) => (append ? [...prev, ...result.data] : result.data))
        setMeta(result.meta)
      } catch {
        toast.error('Erro ao carregar oportunidades')
        if (!append) setItems([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [appliedFilters],
  )

  useEffect(() => {
    loadPage(1, false)
  }, [loadPage])

  useEffect(() => {
    const opportunity = searchParams.get('opportunity')
    if (opportunity) {
      setStartId(Number(opportunity))
      searchParams.delete('opportunity')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const applyFilters = () => {
    setItems([])
    setMeta(null)
    setAppliedFilters({
      createdAtBetween: buildOpportunityDateFilter(filterYear, filterMonth) || undefined,
      showInactive: filterShowInactive || undefined,
    })
  }

  const share = async (card: BusinessDeskItem) => {
    if (!navigator.share) {
      toast.error('O compartilhamento não é suportado neste navegador.')
      return
    }
    try {
      await navigator.share({
        title: 'Oportunidade no Balcão de negócios - Redecoop',
        text: card.description ?? '',
        url: `${window.location.origin}/cooperativa/balcao-de-negocios?opportunity=${card.id}`,
      })
    } catch {
      toast.error('Erro ao compartilhar a oportunidade.')
    }
  }

  const toggleStatus = async (card: BusinessDeskItem) => {
    const nextActive = !card.active
    const ok = await confirm({
      title: `${nextActive ? 'Ativar' : 'Inativar'} Oportunidade - #${card.id}`,
      message: `Tem certeza de que deseja ${nextActive ? 'ativar' : 'inativar'} essa oportunidade?`,
      variant: 'danger',
    })
    if (!ok) return
    try {
      await businessDeskService.changeStatus(card.id, nextActive)
      toast.success(`Oportunidade ${nextActive ? 'ativada' : 'inativada'}.`)
      loadPage(1, false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const softDelete = async (card: BusinessDeskItem) => {
    const ok = await confirm({
      title: `Excluir oportunidade - #${card.id}`,
      message: 'Esta ação remove a oportunidade do balcão de negócios de forma permanente. Deseja continuar?',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await businessDeskService.softDelete(card.id)
      toast.success('Oportunidade excluída.')
      loadPage(1, false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const canContact = (card: BusinessDeskItem) =>
    isCooperative && userCoopId && userCoopId !== card.cooperativeId && userCoopId !== card.cooperative?.id

  return (
    <div className="opportunity-page">
      <PageHeader
        title="Balcão de Negócios"
        description="Oportunidades de negócio entre cooperativas."
        actions={
          isCooperative ? (
            <Button onClick={() => setEditId(null)}>Cadastrar Oportunidade</Button>
          ) : undefined
        }
      />

      {isAdmin && (
        <OpportunityAdminFilters
          filterYear={filterYear}
          filterMonth={filterMonth}
          filterShowInactive={filterShowInactive}
          onYearChange={setFilterYear}
          onMonthChange={setFilterMonth}
          onShowInactiveChange={setFilterShowInactive}
          onApply={applyFilters}
        />
      )}

      {loading ? (
        <LoadingOverlay visible inline message="Buscando oportunidades..." />
      ) : items.length === 0 ? (
        <div className="opportunity-empty">
          <h5>Nada encontrado!</h5>
        </div>
      ) : (
        <div className="opportunity-grid">
          {items.map((card) => (
            <article key={card.id} className="opportunity-card">
              <div className="opportunity-card__body">
                <div className="opportunity-card__top">
                  <div>
                    <p className="opportunity-card__coop">{card.cooperative?.companyName ?? '—'}</p>
                    <p className="opportunity-card__location">{card.cooperative?.city?.name ?? '—'}</p>
                  </div>
                  <CardMenu
                    card={card}
                    admin={isAdmin}
                    userCoopId={userCoopId}
                    onShare={() => share(card)}
                    onEdit={() => setEditId(card.id)}
                    onToggleStatus={() => toggleStatus(card)}
                    onDelete={() => softDelete(card)}
                  />
                </div>
                <div className="opportunity-card__products">
                  {card.businessDeskProducts?.map((item, index) => (
                    <p key={index}>
                      <span className="business-view-products__dot" />
                      {formatKg(item.weight)} - {item.product?.name}
                    </p>
                  ))}
                </div>
                <p className="opportunity-card__description">{card.description}</p>
              </div>
              {canContact(card) && (
                <Button className="opportunity-card__action" onClick={() => setStartId(card.id)}>
                  Contatar
                </Button>
              )}
            </article>
          ))}
        </div>
      )}

      {hasNextPage(meta ?? undefined) && (
        <div className="opportunity-load-more">
          <button type="button" disabled={loadingMore} onClick={() => loadPage(nextPage(meta!)!, true)}>
            {loadingMore ? 'Carregando...' : 'Carregar mais negócios'}
          </button>
        </div>
      )}

      <BusinessDeskModal
        open={editId !== undefined}
        itemId={editId}
        onClose={() => setEditId(undefined)}
        onSaved={() => loadPage(1, false)}
      />
      <StartBusinessDeskModal
        open={!!startId}
        deskId={startId}
        onClose={() => setStartId(null)}
        onStarted={() => loadPage(1, false)}
      />
    </div>
  )
}
