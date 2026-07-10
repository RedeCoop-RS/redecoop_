import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal, Share2 } from 'lucide-react'
import { collectivePurchaseService } from '@/services/business.service'
import {
  CollectivePurchaseModal,
  StartCollectivePurchaseModal,
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
import { formatKg, parseCollectiveProducts } from '@/lib/kg'
import { hasNextPage, nextPage, type PageMeta } from '@/lib/pagination'
import type { CollectivePurchase } from '@/types'

function CardMenu({
  onShare,
  onEdit,
  onToggleStatus,
  active,
  admin,
}: {
  onShare: () => void
  onEdit?: () => void
  onToggleStatus?: () => void
  active?: boolean
  admin: boolean
}) {
  const [open, setOpen] = useState(false)
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
            {admin && onEdit && (
              <button type="button" onClick={() => { setOpen(false); onEdit() }}>
                Editar
              </button>
            )}
            {admin && onToggleStatus && (
              <button type="button" onClick={() => { setOpen(false); onToggleStatus() }}>
                {active ? 'Inativar' : 'Ativar'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function CollectivePurchasePage() {
  const { isAdmin } = useAuth()
  const { confirm } = useModal()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState<CollectivePurchase[]>([])
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
        const result = await collectivePurchaseService.list(page, 10, appliedFilters)
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

  const share = async (card: CollectivePurchase) => {
    if (!navigator.share) {
      toast.error('O compartilhamento não é suportado neste navegador.')
      return
    }
    try {
      await navigator.share({
        title: 'Oportunidade Compra Coletiva - Redecoop',
        text: card.description ?? '',
        url: `${window.location.origin}/cooperativa/compras-coletivas?opportunity=${card.id}`,
      })
    } catch {
      toast.error('Erro ao compartilhar a oportunidade.')
    }
  }

  const toggleStatus = async (card: CollectivePurchase) => {
    const nextActive = !card.active
    const ok = await confirm({
      title: `${nextActive ? 'Ativar' : 'Inativar'} Compra Coletiva - #${card.id}`,
      message: `Tem certeza de que deseja ${nextActive ? 'ativar' : 'inativar'} esta compra coletiva?`,
      variant: 'danger',
    })
    if (!ok) return
    try {
      await collectivePurchaseService.changeStatus(card.id, nextActive)
      toast.success(`Compra coletiva ${nextActive ? 'ativada' : 'inativada'}.`)
      loadPage(1, false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  return (
    <div className="opportunity-page">
      <PageHeader
        title="Compras Coletivas"
        description="Oportunidades de compra em grupo entre cooperativas."
        actions={
          isAdmin ? (
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
          {items.map((card) => {
            const products = parseCollectiveProducts(card.products)
            return (
              <article key={card.id} className="opportunity-card">
                <div className="opportunity-card__body">
                  <div className="opportunity-card__top">
                    <p className="opportunity-card__location">
                      {card.city?.name ?? '—'}
                      {card.city?.state?.abbreviation ? `, ${card.city.state.abbreviation}` : ''}
                    </p>
                    <CardMenu
                      admin={isAdmin}
                      active={card.active}
                      onShare={() => share(card)}
                      onEdit={isAdmin ? () => setEditId(card.id) : undefined}
                      onToggleStatus={isAdmin ? () => toggleStatus(card) : undefined}
                    />
                  </div>
                  <div className="opportunity-card__products">
                    {products.map((product, index) => (
                      <p key={index}>
                        <span className="business-view-products__dot" />
                        {formatKg(product.weight)} de {product.productName}
                      </p>
                    ))}
                  </div>
                  <p className="opportunity-card__description">{card.description}</p>
                </div>
                {!isAdmin && (
                  <Button className="opportunity-card__action" onClick={() => setStartId(card.id)}>
                    Contatar
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {hasNextPage(meta ?? undefined) && (
        <div className="opportunity-load-more">
          <button type="button" disabled={loadingMore} onClick={() => loadPage(nextPage(meta!)!, true)}>
            {loadingMore ? 'Carregando...' : 'Carregar mais compras'}
          </button>
        </div>
      )}

      <CollectivePurchaseModal
        open={editId !== undefined}
        itemId={editId}
        onClose={() => setEditId(undefined)}
        onSaved={() => loadPage(1, false)}
      />
      <StartCollectivePurchaseModal
        open={!!startId}
        purchaseId={startId}
        onClose={() => setStartId(null)}
        onStarted={() => loadPage(1, false)}
      />
    </div>
  )
}
