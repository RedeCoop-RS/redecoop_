import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, MessageSquare, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { businessDeskService, collectivePurchaseService } from '@/services/business.service'
import { travelOfferService } from '@/services/travel.service'
import {
  businessStatusClass,
  businessStatusLabel,
  formatBusinessDate,
  formatBusinessFee,
  isUserOfferingBusiness,
} from '@/lib/business'
import {
  BusinessStatus,
  BusinessType,
  type Business,
  type BusinessDeskItem,
  type CollectivePurchase,
  type TravelOffer,
  type TravelRoute,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'

const OFFER_DECISION_BLOCKED = new Set(['confirmed', 'confirmedPendingRoutes', 'rejected'])

type CollectiveProduct = { productName?: string; weight?: number }

function parseCollectiveProducts(products: unknown): CollectiveProduct[] {
  if (!products) return []
  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return Array.isArray(products) ? products : []
}

function totalRouteKm(routes?: TravelRoute[]) {
  if (!routes?.length) return 0
  return routes.reduce((sum, route) => sum + (route.distance ?? 0), 0)
}

function truncateAddress(address?: string, max = 40) {
  if (!address) return '—'
  return address.length > max ? `${address.slice(0, max)}…` : address
}

function travelStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    negotiating: 'Negociando',
    confirmed: 'Confirmado',
    done: 'Realizado',
    canceled: 'Cancelado',
    cancelled: 'Cancelado',
    available: 'Disponível',
    in_progress: 'Em andamento',
  }
  if (!status) return '—'
  return labels[status.toLowerCase()] ?? status
}

function RouteTimeline({
  routes,
  variant = 'green',
}: {
  routes?: TravelRoute[]
  variant?: 'green' | 'blue'
}) {
  if (!routes?.length) {
    return <p className="business-view-empty-inline">Nenhuma parada cadastrada.</p>
  }

  return (
    <div className="business-route-timeline">
      {routes.map((stop, index) => {
        const last = index === routes.length - 1
        const nextDistance = routes[index + 1]?.distance
        return (
          <div key={`${stop.order}-${stop.address}-${index}`} className="business-route-timeline__row">
            <div className="business-route-timeline__distance">
              {!last && nextDistance != null ? <span>{nextDistance}Km</span> : null}
            </div>
            <div className="business-route-timeline__stop">
              <div className={`business-route-timeline__icon${last ? ' business-route-timeline__icon--last' : ''}`}>
                <span className={`business-route-timeline__circle business-route-timeline__circle--${variant}`}>
                  {stop.order ?? index + 1}
                </span>
              </div>
              <div className="business-route-timeline__details">
                <p className="business-route-timeline__address">{truncateAddress(stop.address, 60)}</p>
                <div className="business-route-timeline__meta">
                  {stop.loadingWeight != null && <span title="Carga">↑ {stop.loadingWeight}</span>}
                  {stop.unloadingWeight != null && <span title="Descarga">↓ {stop.unloadingWeight}</span>}
                  {stop.remainingCapacity != null && <span>LIVRE: {stop.remainingCapacity}</span>}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <p className="business-route-timeline__total">TOTAL: {totalRouteKm(routes)}km</p>
    </div>
  )
}

function ProductList({ items }: { items: { label: string; weight?: number }[] }) {
  if (!items.length) return <p className="business-view-empty-inline">Nenhum produto informado.</p>
  return (
    <ul className="business-view-products">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <span className="business-view-products__dot" />
          <span>
            {item.weight != null ? `${item.weight}Kg - ` : ''}
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="business-view-accordion" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="business-view-accordion__body">{children}</div>
    </details>
  )
}

function TravelChangelogFooter({
  changelogs,
  hideContent,
}: {
  changelogs?: TravelOffer['changelogs']
  hideContent?: boolean
}) {
  if (!changelogs?.length) return null
  return (
    <div className="business-view-changelogs">
      {changelogs.map((changelog, index) => (
        <div key={`${changelog.createdAt}-${index}`} className="business-view-changelog">
          <div className="business-view-changelog__divider">
            <hr />
            <div className="business-view-changelog__title">
              <span dangerouslySetInnerHTML={{ __html: changelog.title ?? '' }} />
              {changelog.createdAt && <small>{formatBusinessDate(changelog.createdAt)}</small>}
            </div>
            <hr />
          </div>
          {changelog.content && !hideContent && (
            <div
              className="business-view-changelog__content"
              dangerouslySetInnerHTML={{ __html: changelog.content }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function BusinessSummaryCards({ business }: { business: Business }) {
  return (
    <>
      <div className="business-view-summary__card">
        <span className="business-view-summary__label">Tipo</span>
        <strong>{business.type}-{business.id}</strong>
      </div>
      <div className="business-view-summary__card">
        <span className="business-view-summary__label">Status</span>
        <span className={businessStatusClass(business.status)}>{businessStatusLabel(business.status)}</span>
      </div>
      <div className="business-view-summary__card">
        <span className="business-view-summary__label">Ofertante</span>
        <strong>{business.offeringCooperative?.companyName ?? business.offeringCooperative?.fantasyName ?? '—'}</strong>
      </div>
      <div className="business-view-summary__card">
        <span className="business-view-summary__label">Solicitante</span>
        <strong>{business.requestingCooperative?.companyName ?? business.requestingCooperative?.fantasyName ?? '—'}</strong>
      </div>
      <div className="business-view-summary__card">
        <span className="business-view-summary__label">Valor / Taxa</span>
        <strong>{formatBusinessFee(business.fee)}</strong>
      </div>
      <div className="business-view-summary__card">
        <span className="business-view-summary__label">Data</span>
        <strong>{formatBusinessDate(business.createdAt)}</strong>
      </div>
    </>
  )
}

export function BusinessViewModal({
  open,
  business,
  onClose,
}: {
  open: boolean
  business: Business | null
  onClose: () => void
}) {
  const { isAdmin, isCooperative, user } = useAuth()
  const { confirm } = useModal()
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [travelOffer, setTravelOffer] = useState<TravelOffer | null>(null)
  const [businessDesk, setBusinessDesk] = useState<BusinessDeskItem | null>(null)
  const [collectivePurchase, setCollectivePurchase] = useState<CollectivePurchase | null>(null)
  const [displayBusiness, setDisplayBusiness] = useState<Business | null>(business)

  useEffect(() => {
    setDisplayBusiness(business)
  }, [business])

  useEffect(() => {
    if (!open || !business) {
      setTravelOffer(null)
      setBusinessDesk(null)
      setCollectivePurchase(null)
      setLoadingDetails(false)
      setDeciding(false)
      return
    }

    setLoadingDetails(true)
    const load = async () => {
      try {
        if (business.type === BusinessType.V && business.travelOffer?.id) {
          const offer = await travelOfferService.view(business.travelOffer.id)
          setTravelOffer(offer)
          if (offer.business) {
            setDisplayBusiness((prev) => (prev ? { ...prev, ...offer.business } : offer.business ?? prev))
          }
        } else if (business.type === BusinessType.BN && business.businessDesk?.id) {
          const desk = await businessDeskService.view(business.businessDesk.id)
          setBusinessDesk(desk)
        } else if (business.type === BusinessType.CC && business.collectivePurchase?.id) {
          const purchase = await collectivePurchaseService.view(business.collectivePurchase.id)
          setCollectivePurchase(purchase)
        }
      } catch {
        toast.error('Erro ao carregar detalhes do negócio')
      } finally {
        setLoadingDetails(false)
      }
    }

    load()
  }, [open, business])

  const conversationId =
    displayBusiness?.conversation?.id ??
    business?.conversation?.id ??
    travelOffer?.business?.conversation?.id ??
    null

  const title = useMemo(() => {
    if (!displayBusiness && !business) return 'Negócio'
    const current = displayBusiness ?? business
    if (!current) return 'Negócio'
    if (current.type === BusinessType.V) {
      const travelId = travelOffer?.travel?.id ?? current.travelOffer?.travel?.id
      const offerId = travelOffer?.id ?? current.travelOffer?.id
      return `Viagem #${travelId ?? '—'} · Proposta #${offerId ?? '—'}`
    }
    if (current.type === BusinessType.BN) {
      return `Conversa #${conversationId ?? '—'} · Balcão #${current.businessDesk?.id ?? '—'}`
    }
    if (current.type === BusinessType.CC) {
      return `Conversa #${conversationId ?? '—'} · Compra coletiva #${current.collectivePurchase?.id ?? '—'}`
    }
    return `Negócio ${current.type}-${current.id}`
  }, [business, displayBusiness, travelOffer, conversationId])

  const deskProducts =
    businessDesk?.businessDeskProducts?.map((item) => ({
      label: item.product?.name ?? 'Produto',
      weight: item.weight,
    })) ?? []

  const collectiveProducts = parseCollectiveProducts(collectivePurchase?.products).map((item) => ({
    label: item.productName ?? 'Produto',
    weight: item.weight,
  }))

  const chatHeader =
    (displayBusiness ?? business)?.type === BusinessType.BN ? (
      <div className="business-view-chat-details">
        <ProductList items={deskProducts} />
        {businessDesk?.description && <p className="business-view-desc">{businessDesk.description}</p>}
        {loadingDetails && !businessDesk && <LoadingOverlay visible inline message="Carregando balcão..." />}
      </div>
    ) : (displayBusiness ?? business)?.type === BusinessType.CC ? (
      <div className="business-view-chat-details">
        {collectivePurchase?.city?.name && (
          <p className="business-view-meta">
            <strong>Cidade:</strong> {collectivePurchase.city.name}
          </p>
        )}
        <ProductList items={collectiveProducts} />
        {collectivePurchase?.description && (
          <p className="business-view-desc">{collectivePurchase.description}</p>
        )}
        {loadingDetails && !collectivePurchase && (
          <LoadingOverlay visible inline message="Carregando compra coletiva..." />
        )}
      </div>
    ) : undefined

  const chatFooter =
    (displayBusiness ?? business)?.type === BusinessType.V ? (
      <TravelChangelogFooter changelogs={travelOffer?.changelogs} hideContent={isAdmin} />
    ) : undefined

  const currentBusiness = displayBusiness ?? business
  const isTravel = currentBusiness?.type === BusinessType.V
  const offerStatus = (travelOffer?.status ?? '').toLowerCase()
  const businessStatus = (currentBusiness?.status ?? travelOffer?.business?.status ?? '').toLowerCase()
  const isOfferingCoop =
    !!user?.cooperative?.id &&
    (isUserOfferingBusiness(currentBusiness ?? { id: 0 }, user.cooperative.id) ||
      travelOffer?.travel?.cooperative?.id === user.cooperative.id)
  const canDecideOffer =
    isCooperative &&
    !!travelOffer?.id &&
    isOfferingCoop &&
    businessStatus === BusinessStatus.Negotiating &&
    !OFFER_DECISION_BLOCKED.has(offerStatus)

  const decideOffer = async (approved: boolean) => {
    if (!travelOffer?.id || deciding) return
    const ok = await confirm({
      title: approved ? 'Aceitar proposta' : 'Rejeitar proposta',
      message: approved
        ? 'Tem certeza de que deseja aceitar esta proposta de viagem?'
        : 'Tem certeza de que deseja rejeitar esta proposta? Esta ação não pode ser desfeita.',
      confirmLabel: approved ? 'Aceitar' : 'Rejeitar',
      variant: approved ? 'primary' : 'danger',
    })
    if (!ok) return

    setDeciding(true)
    try {
      await travelOfferService.approve(travelOffer.id, approved)
      const nextStatus = approved ? BusinessStatus.Confirmed : BusinessStatus.Canceled
      const nextOfferStatus = approved ? 'confirmedPendingRoutes' : 'rejected'
      setDisplayBusiness((prev) => (prev ? { ...prev, status: nextStatus } : prev))
      setTravelOffer((prev) =>
        prev
          ? {
              ...prev,
              status: nextOfferStatus,
              business: prev.business ? { ...prev.business, status: nextStatus } : prev.business,
            }
          : prev,
      )
      toast.success(approved ? 'Proposta aceita!' : 'Proposta rejeitada.')
      window.dispatchEvent(new CustomEvent('business:changed'))
      try {
        const refreshed = await travelOfferService.view(travelOffer.id)
        setTravelOffer(refreshed)
        if (refreshed.business) {
          setDisplayBusiness((prev) => (prev ? { ...prev, ...refreshed.business } : prev))
        }
      } catch {
        // Mantém o estado local já atualizado
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao processar proposta')
    } finally {
      setDeciding(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      panelClassName="business-view-modal"
      bodyClassName="business-view-modal__body"
    >
      {currentBusiness && (
        <div className="business-view-summary business-view-summary--top">
          <BusinessSummaryCards business={currentBusiness} />
        </div>
      )}

      <div className={`business-view-layout${isTravel ? ' business-view-layout--split' : ''}`}>
        {isTravel && (
          <aside className="business-view-layout__details">
            <div className="business-view-travel">
              {loadingDetails && !travelOffer ? (
                <LoadingOverlay visible inline message="Carregando proposta..." />
              ) : (
                <>
                  <AccordionSection title="Detalhes">
                    <div className="business-view-travel-meta">
                      <span><strong>Status:</strong> {travelStatusLabel(travelOffer?.travel?.status)}</span>
                      <span><strong>Veículo:</strong> {travelOffer?.travel?.vehicle?.type?.name ?? '—'}</span>
                      <span><strong>Motorista:</strong> {travelOffer?.travel?.driver?.name ?? '—'}</span>
                    </div>
                    <p className="business-view-travel-date">
                      {travelOffer?.travel?.startDateTime
                        ? formatBusinessDate(travelOffer.travel.startDateTime)
                        : '—'}
                    </p>
                  </AccordionSection>

                  <AccordionSection title="Trajeto original">
                    <RouteTimeline
                      routes={travelOffer?.travel?.travelRoutes ?? travelOffer?.travel?.routes}
                      variant="green"
                    />
                  </AccordionSection>

                  <AccordionSection title="Proposta recebida">
                    <RouteTimeline routes={travelOffer?.routes} variant="blue" />
                    <div className="business-view-proposal-summary">
                      <p>DISTÂNCIA: {totalRouteKm(travelOffer?.routes)}km</p>
                      <p>
                        VALOR ESTIMADO PELO FRETE:{' '}
                        {formatBusinessFee(travelOffer?.business?.fee ?? currentBusiness?.fee)}
                      </p>
                    </div>
                    {canDecideOffer && (
                      <div className="business-view-proposal-actions">
                        <Button
                          type="button"
                          variant="danger"
                          disabled={deciding}
                          onClick={() => decideOffer(false)}
                        >
                          <X size={16} />
                          Rejeitar
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={deciding}
                          onClick={() => decideOffer(true)}
                        >
                          <Check size={16} />
                          {deciding ? 'Processando...' : 'Aceitar'}
                        </Button>
                      </div>
                    )}
                  </AccordionSection>
                </>
              )}
            </div>
          </aside>
        )}

        <section className="business-view-layout__chat business-view-modal__chat">
          <div className="business-view-chat-header">
            <div className="business-view-chat-header__title">
              <MessageSquare size={18} />
              <div>
                <h3>Mensagens</h3>
                <p>A troca de propostas será intermediada pela Rede COOP.</p>
              </div>
            </div>
          </div>

          {conversationId ? (
            <ChatPanel
              key={conversationId}
              conversationId={conversationId}
              showCooperativeName={isAdmin}
              header={chatHeader}
              footer={chatFooter}
            />
          ) : (
            <p className="business-view-empty">Nenhuma conversa vinculada a este negócio.</p>
          )}
        </section>
      </div>
    </Modal>
  )
}
