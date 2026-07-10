import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { businessDeskService, collectivePurchaseService } from '@/services/business.service'
import { travelOfferService } from '@/services/travel.service'
import {
  businessStatusClass,
  businessStatusLabel,
  formatBusinessDate,
  formatBusinessFee,
} from '@/lib/business'
import {
  BusinessType,
  type Business,
  type BusinessDeskItem,
  type CollectivePurchase,
  type TravelOffer,
  type TravelRoute,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

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
  const { isAdmin } = useAuth()
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [travelOffer, setTravelOffer] = useState<TravelOffer | null>(null)
  const [businessDesk, setBusinessDesk] = useState<BusinessDeskItem | null>(null)
  const [collectivePurchase, setCollectivePurchase] = useState<CollectivePurchase | null>(null)

  useEffect(() => {
    if (!open || !business) {
      setTravelOffer(null)
      setBusinessDesk(null)
      setCollectivePurchase(null)
      setLoadingDetails(false)
      return
    }

    setLoadingDetails(true)
    const load = async () => {
      try {
        if (business.type === BusinessType.V && business.travelOffer?.id) {
          const offer = await travelOfferService.view(business.travelOffer.id)
          setTravelOffer(offer)
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
    business?.conversation?.id ?? travelOffer?.business?.conversation?.id ?? null

  const title = useMemo(() => {
    if (!business) return 'Negócio'
    if (business.type === BusinessType.V) {
      const travelId = travelOffer?.travel?.id ?? business.travelOffer?.travel?.id
      const offerId = travelOffer?.id ?? business.travelOffer?.id
      return `Viagem #${travelId ?? '—'} · Proposta #${offerId ?? '—'}`
    }
    if (business.type === BusinessType.BN) {
      return `Conversa #${conversationId ?? '—'} · Balcão #${business.businessDesk?.id ?? '—'}`
    }
    if (business.type === BusinessType.CC) {
      return `Conversa #${conversationId ?? '—'} · Compra coletiva #${business.collectivePurchase?.id ?? '—'}`
    }
    return `Negócio ${business.type}-${business.id}`
  }, [business, travelOffer, conversationId])

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
    business?.type === BusinessType.BN ? (
      <div className="business-view-chat-details">
        <ProductList items={deskProducts} />
        {businessDesk?.description && <p className="business-view-desc">{businessDesk.description}</p>}
        {loadingDetails && !businessDesk && <LoadingOverlay visible inline message="Carregando balcão..." />}
      </div>
    ) : business?.type === BusinessType.CC ? (
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
    business?.type === BusinessType.V ? (
      <TravelChangelogFooter changelogs={travelOffer?.changelogs} hideContent={isAdmin} />
    ) : undefined

  const isTravel = business?.type === BusinessType.V

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      panelClassName="business-view-modal"
      bodyClassName="business-view-modal__body"
    >
      {business && (
        <div className="business-view-summary business-view-summary--top">
          <BusinessSummaryCards business={business} />
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
                      <p>VALOR ESTIMADO PELO FRETE: {formatBusinessFee(travelOffer?.business?.fee ?? business?.fee)}</p>
                    </div>
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
