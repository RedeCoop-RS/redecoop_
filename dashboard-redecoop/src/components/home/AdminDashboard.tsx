import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Handshake,
  Inbox,
  MessageSquare,
  Package,
  Truck,
  UserPlus,
} from 'lucide-react'
import { ChartCard } from '@/components/charts/ChartCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { TravelFinalizeModal } from '@/components/modals/TravelModals'
import { usePendingRequests } from '@/contexts/PendingRequestsContext'
import { useBusinessView } from '@/contexts/BusinessViewContext'
import { graphService } from '@/services/graph.service'
import { cooperativeService } from '@/services/cooperative.service'
import { productService, conversationService } from '@/services/product.service'
import { requestService } from '@/services/misc.service'
import { travelService } from '@/services/travel.service'
import { businessService } from '@/services/business.service'
import {
  BUSINESS_TYPE_LABELS,
  businessListTitle,
  cooperativeBusinessLabel,
} from '@/lib/business'
import { formatTravelDeparture, travelStatusLabel } from '@/lib/travel'
import type { GraphData, RegistrationRequest, Conversation, Travel, Business, BusinessType } from '@/types'

type InboxKind = 'request' | 'message' | 'travel' | 'mediation'

interface InboxItem {
  id: string
  kind: InboxKind
  title: string
  subtitle: string
  href: string
  badge: string
  when?: string
  travel?: Travel
  business?: Business
}

interface AdminCharts {
  title: string
  type: 'column' | 'pie'
  data: GraphData
}

interface AdminPayload {
  cooperatives: number
  products: number
  requests: RegistrationRequest[]
  requestTotal: number
  unreadMessages: number
  conversations: Conversation[]
  travels: Travel[]
  travelTotal: number
  mediations: Business[]
  mediationTotal: number
  charts: AdminCharts[]
}

const KIND_ICON = {
  request: UserPlus,
  message: MessageSquare,
  travel: Truck,
  mediation: Handshake,
} as const

function relativeTime(iso?: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days === 1 ? '' : 's'}`
}

function coopName(conversation: Conversation) {
  return (
    conversation.initiatorCooperative?.fantasyName ||
    conversation.initiatorCooperative?.companyName ||
    conversation.participantCooperative?.fantasyName ||
    conversation.participantCooperative?.companyName ||
    conversation.title ||
    `Conversa #${conversation.id}`
  )
}

function travelLabel(travel: Travel) {
  const dest = travel.destination || travel.origin
  if (dest) return dest
  return `Viagem #${travel.id}`
}

function mediationSubtitle(business: Business) {
  const type = BUSINESS_TYPE_LABELS[business.type as BusinessType] ?? 'Negócio'
  const offering = cooperativeBusinessLabel(business.offeringCooperative)
  const requesting = cooperativeBusinessLabel(business.requestingCooperative)
  if (offering !== '—' && requesting !== '—') return `${type} · ${offering} e ${requesting}`
  return `Aguardando intermediação · ${type}`
}

async function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

const emptyGraph: GraphData = { categories: [], data: [] }

export function AdminDashboard() {
  const { count: pendingFromContext } = usePendingRequests()
  const { openBusinessViewAndGoToList } = useBusinessView()
  const [payload, setPayload] = useState<AdminPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [finalizeTravel, setFinalizeTravel] = useState<Travel | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(false)
    }

    const [
      coops,
      products,
      requests,
      conversations,
      travels,
      mediations,
      coopChart,
      visitantChart,
      visitantType,
      categories,
    ] = await Promise.all([
      settled(cooperativeService.list(1, 1), { data: [], total: 0, totalDebits: 0 }),
      settled(productService.listAdmin(1, 1), {
        data: [],
        meta: { totalItems: 0 },
        raw: {},
      }),
      settled(requestService.list(1, 8), {
        data: [],
        total: 0,
        meta: { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 8 },
      }),
      settled(conversationService.list(1, 8), {
        data: [] as Conversation[],
        meta: { totalItems: 0 },
        totalUnreadMessages: 0,
      }),
      settled(travelService.available(1, 8, { status: 'awaiting' }), {
        data: [] as Travel[],
        meta: { totalItems: 0 },
        raw: {},
      }),
      settled(businessService.listAdmin(1, 4, { awaitingMediation: true }), {
        data: [] as Business[],
        total: 0,
        negotiatingCount: 0,
      }),
      settled(graphService.totalCooperativesByMunicipality(), emptyGraph),
      settled(graphService.totalVisitantsByMunicipality(), emptyGraph),
      settled(graphService.totalVisitantsByType(), emptyGraph),
      settled(graphService.totalProductCategories(), emptyGraph),
    ])

    const chartsFailed = [coopChart, visitantChart, visitantType, categories].every(
      (c) => (c.categories?.length ?? 0) === 0 && c.data.length === 0,
    )

    setPayload({
      cooperatives: coops.total,
      products: products.meta?.totalItems ?? products.data?.length ?? 0,
      requests: requests.data ?? [],
      requestTotal: requests.total ?? requests.meta?.totalItems ?? requests.data?.length ?? 0,
      unreadMessages: conversations.totalUnreadMessages ?? 0,
      conversations: conversations.data ?? [],
      travels: travels.data ?? [],
      travelTotal: travels.meta?.totalItems ?? travels.data?.length ?? 0,
      mediations: mediations.data ?? [],
      mediationTotal: mediations.total ?? mediations.data?.length ?? 0,
      charts: [
        { title: 'Cooperativas por município', type: 'column', data: coopChart },
        { title: 'Visitantes por município', type: 'column', data: visitantChart },
        { title: 'Visitantes por tipo', type: 'pie', data: visitantType },
        { title: 'Categorias de produtos', type: 'pie', data: categories },
      ],
    })
    setError(chartsFailed && !requests.data?.length)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const inbox = useMemo<InboxItem[]>(() => {
    if (!payload) return []
    const items: InboxItem[] = []

    for (const request of payload.requests) {
      items.push({
        id: `request-${request.id}`,
        kind: 'request',
        title: request.name,
        subtitle: request.email || request.cnpj,
        href: '/admin/visitantes-e-solicitacoes?tab=requests',
        badge: 'Cadastro',
        when: relativeTime(request.createdAt),
      })
    }

    for (const business of payload.mediations.slice(0, 4)) {
      items.push({
        id: `biz-${business.id}`,
        kind: 'mediation',
        title: businessListTitle(business),
        subtitle: mediationSubtitle(business),
        href: '/admin/negocios',
        badge: 'Mediação',
        when: relativeTime(business.createdAt),
        business,
      })
    }

    const unreadConversations = payload.conversations.filter(
      (c) => (c.totalMessagesNotSeenByMe ?? c.unread ?? 0) > 0,
    )
    for (const conversation of unreadConversations.slice(0, 4)) {
      const unseen = conversation.totalMessagesNotSeenByMe ?? conversation.unread ?? 0
      items.push({
        id: `msg-${conversation.id}`,
        kind: 'message',
        title: coopName(conversation),
        subtitle: `${unseen} não lida${unseen === 1 ? '' : 's'}`,
        href: `/admin/mensagens?conversation=${conversation.id}`,
        badge: 'Chat',
        when: relativeTime(conversation.updatedAt),
      })
    }

    for (const travel of payload.travels.slice(0, 4)) {
      items.push({
        id: `travel-${travel.id}`,
        kind: 'travel',
        title: travelLabel(travel),
        subtitle: `${travelStatusLabel(travel.status)} · ${formatTravelDeparture(travel.startDateTime)}`,
        href: '/admin/viagens-disponiveis',
        badge: 'CoopFrete',
        when: relativeTime(travel.startDateTime),
        travel,
      })
    }

    return items.slice(0, 10)
  }, [payload])

  const attentionCount = payload
    ? (payload.requestTotal || pendingFromContext) +
      payload.unreadMessages +
      payload.travelTotal +
      payload.mediationTotal
    : 0

  if (loading) {
    return (
      <div className="admin-home">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="mt-3 h-8 w-20 rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="mb-8 h-64 animate-pulse rounded-2xl bg-gray-100" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="chart-card animate-pulse">
              <div className="h-14 bg-gray-100" />
              <div className="h-[300px] bg-gray-50" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="admin-alert">
        <div>
          <p className="admin-alert__title">Não deu pra montar o painel</p>
          <p className="admin-alert__text">Recarrega a página. Se persistir, a API pode estar fora.</p>
        </div>
      </div>
    )
  }

  const requestTotal = payload.requestTotal || pendingFromContext

  return (
    <div className="admin-home">
      {attentionCount > 0 && (
        <div className={`admin-alert${requestTotal > 0 ? '' : ' admin-alert--warn'}`}>
          <Inbox size={18} />
          <div>
            <p className="admin-alert__title">
              {attentionCount === 1
                ? '1 coisa precisa de você agora'
                : `${attentionCount} coisas precisam de você agora`}
            </p>
            <p className="admin-alert__text">
              Solicitações, mediações, chats e viagens abertas — resolve aqui embaixo sem caçar no menu.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/admin/cooperativas" className="admin-stat-link">
          <StatCard
            label="Cooperativas"
            value={payload.cooperatives.toLocaleString('pt-BR')}
            icon={Building2}
            trend="Cadastradas na rede"
            variant="green"
          />
        </Link>
        <Link to="/admin/produtos" className="admin-stat-link">
          <StatCard
            label="Produtos"
            value={payload.products.toLocaleString('pt-BR')}
            icon={Package}
            trend="No catálogo global"
            variant="blue"
          />
        </Link>
        <Link to="/admin/visitantes-e-solicitacoes?tab=requests" className="admin-stat-link">
          <StatCard
            label="Solicitações"
            value={requestTotal.toLocaleString('pt-BR')}
            icon={UserPlus}
            trend="Cadastros esperando aceite"
            variant="yellow"
          />
        </Link>
        <Link to="/admin/mensagens" className="admin-stat-link">
          <StatCard
            label="Mensagens"
            value={payload.unreadMessages.toLocaleString('pt-BR')}
            icon={MessageSquare}
            trend="Não lidas no chat"
            variant="mint"
          />
        </Link>
      </div>

      <section className="admin-inbox">
        <div className="admin-inbox__header">
          <div>
            <h2>Precisa da sua atenção</h2>
            <p>Fila do dia: cadastro, mediação, conversa e viagem.</p>
          </div>
          {inbox.length > 0 && (
            <span className={`admin-inbox__count${requestTotal > 0 ? ' admin-inbox__count--alert' : ''}`}>
              {inbox.length} na fila
            </span>
          )}
        </div>
        <div className="admin-inbox__body">
          {inbox.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} />}
              title="Nada pendente"
              description="Fila limpa. Quando chegar cadastro, mediação, chat ou viagem, aparece aqui."
            />
          ) : (
            <ul className="admin-inbox__list">
              {inbox.map((item) => {
                const Icon = KIND_ICON[item.kind]
                const canFinalize = item.kind === 'travel' && item.travel && item.travel.status !== 'completed'
                return (
                  <li key={item.id}>
                    <div className="admin-inbox__row">
                      <Link
                        to={item.href}
                        className="admin-inbox__main"
                        onClick={(event) => {
                          if (!item.business) return
                          event.preventDefault()
                          openBusinessViewAndGoToList(item.business, '/admin/negocios')
                        }}
                      >
                        <span className={`admin-inbox__icon admin-inbox__icon--${item.kind}`}>
                          <Icon size={16} />
                        </span>
                        <span className="admin-inbox__copy">
                          <span className="admin-inbox__title">{item.title}</span>
                          <span className="admin-inbox__sub">{item.subtitle}</span>
                        </span>
                        {item.when && <span className="admin-inbox__when">{item.when}</span>}
                        <span className={`admin-inbox__badge admin-inbox__badge--${item.kind}`}>
                          {item.badge}
                        </span>
                      </Link>
                      {canFinalize && (
                        <button
                          type="button"
                          className="admin-inbox__finalize"
                          onClick={() => setFinalizeTravel(item.travel ?? null)}
                        >
                          Finalizar
                        </button>
                      )}
                      <ArrowRight size={16} className="admin-inbox__arrow" />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          Alguns gráficos não carregaram. O resto do painel segue no ar.
        </div>
      )}

      <section className="admin-charts">
        <div className="admin-charts__header">
          <h2>Retrato da rede</h2>
          <p>Municípios, visitantes e categorias — o recorte do dia.</p>
        </div>
        <div className="admin-charts__grid">
          {payload.charts.map((chart) => (
            <ChartCard key={chart.title} title={chart.title} data={chart.data} type={chart.type} />
          ))}
        </div>
      </section>

      <TravelFinalizeModal
        open={finalizeTravel != null}
        travel={finalizeTravel}
        onClose={() => setFinalizeTravel(null)}
        onSaved={() => void load(true)}
      />
    </div>
  )
}
