import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Handshake,
  MessageSquare,
  Package,
  Percent,
  Sprout,
  Truck,
  Users,
} from 'lucide-react'
import { useBusinessView } from '@/contexts/BusinessViewContext'
import { StatCard } from '@/components/ui/StatCard'
import { businessService } from '@/services/business.service'
import { catalogService } from '@/services/product.service'
import { cafService } from '@/services/misc.service'
import { travelService } from '@/services/travel.service'
import {
  businessListTitle,
  businessRecentSubtitle,
  businessUnreadMessagesCount,
  BUSINESS_TYPE_LABELS,
} from '@/lib/business'
import type { Business, BusinessType } from '@/types'

interface CoopDashboardStats {
  catalogProducts: number
  businessTotal: number
  negotiatingCount: number
  openTravels: number
  availableTravels: number
  cafTotalSocios: number
  cafPercentComCaf: string | null
  cafLastUpdate: string | null
}

const QUICK_LINKS = [
  { to: '/cooperativa/produtos', label: 'Meus produtos', icon: Package },
  { to: '/cooperativa/negocios', label: 'Negócios', icon: Handshake },
  { to: '/cooperativa/minhas-viagens', label: 'Minhas viagens', icon: Truck },
  { to: '/cooperativa/mensagens', label: 'Mensagens', icon: MessageSquare },
  { to: '/cooperativa/caf', label: 'Painel CAF', icon: Sprout },
  { to: '/cooperativa/balcao-de-negocios', label: 'Balcão', icon: Handshake },
] as const

function formatCafDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function businessTypeName(type?: string) {
  if (!type) return 'Negócio'
  return BUSINESS_TYPE_LABELS[type as BusinessType] ?? type
}

export function CooperativeDashboard({ cooperativeId }: { cooperativeId: number }) {
  const { openBusinessViewAndGoToList } = useBusinessView()
  const [stats, setStats] = useState<CoopDashboardStats | null>(null)
  const [recentBusinesses, setRecentBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(false)

      try {
        const [catalog, businesses, negotiating, myTravels, availableTravels, cafPanel] =
          await Promise.all([
            catalogService.list(1, 1),
            businessService.listCooperative(1, 1),
            businessService.listCooperative(1, 5, { status: 'negotiating' }),
            travelService.myTravels(1, 1, { notfinished: true }),
            travelService.available(1, 1),
            cafService.getPanel().catch(() => null),
          ])

        if (cancelled) return

        const totalSocios = (cafPanel?.totalComCaf ?? 0) + (cafPanel?.totalSemCaf ?? 0)
        const cafPercent =
          totalSocios > 0
            ? (((cafPanel?.totalComCaf ?? 0) / totalSocios) * 100).toFixed(1)
            : null

        setStats({
          catalogProducts: catalog.meta.totalItems ?? catalog.data.length,
          businessTotal: businesses.total,
          negotiatingCount: businesses.negotiatingCount,
          openTravels: myTravels.openCount,
          availableTravels: availableTravels.meta.totalItems ?? availableTravels.data.length,
          cafTotalSocios: totalSocios,
          cafPercentComCaf: cafPercent,
          cafLastUpdate: cafPanel?.lastUpdate ?? null,
        })

        setRecentBusinesses(negotiating.data)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [cooperativeId])

  const cafTrend = useMemo(() => {
    if (!stats) return undefined
    if (stats.cafTotalSocios === 0) return 'Sem dados CAF importados'
    const date = formatCafDate(stats.cafLastUpdate)
    const pct = stats.cafPercentComCaf
    return pct ? `${pct}% com CAF ativo${date ? ` · atualizado em ${date}` : ''}` : undefined
  }, [stats])

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Produtos no catálogo"
          value={stats?.catalogProducts.toLocaleString('pt-BR') ?? '—'}
          icon={Package}
          trend="Cadastrados pela cooperativa"
          variant="green"
          loading={loading}
        />
        <StatCard
          label="Negócios em negociação"
          value={stats?.negotiatingCount.toLocaleString('pt-BR') ?? '—'}
          icon={Handshake}
          trend={
            stats
              ? `${stats.businessTotal.toLocaleString('pt-BR')} no total`
              : 'Aguardando definição'
          }
          variant="blue"
          loading={loading}
        />
        <StatCard
          label="Viagens em aberto"
          value={stats?.openTravels.toLocaleString('pt-BR') ?? '—'}
          icon={Truck}
          trend={
            stats
              ? `${stats.availableTravels.toLocaleString('pt-BR')} disponíveis na rede`
              : 'CoopFrete'
          }
          variant="mint"
          loading={loading}
        />
        <StatCard
          label="Sócios (CAF)"
          value={stats?.cafTotalSocios ? stats.cafTotalSocios.toLocaleString('pt-BR') : '—'}
          icon={Users}
          trend={cafTrend}
          variant="green"
          loading={loading}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          Não foi possível carregar o painel. Verifique a API e tente atualizar a página.
        </div>
      )}

      <div className="panel-card mb-8">
        <div className="panel-card__header panel-card__header--accent">
          <span>Atalhos rápidos</span>
        </div>
        <div className="panel-card__body">
          <div className="home-quick-links">
            {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="home-quick-link">
                <Icon size={18} className="text-green shrink-0" />
                <span>{label}</span>
                <ArrowRight size={14} className="home-quick-link__arrow" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!loading && recentBusinesses.length > 0 && (
        <div className="panel-card">
          <div className="panel-card__header">
            <span>Negócios em negociação</span>
            <Link to="/cooperativa/negocios?status=negotiating" className="home-recent-link">
              Ver todos
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="panel-card__body home-recent-body">
            <ul className="home-recent-list">
              {recentBusinesses.map((business) => {
                const unread = businessUnreadMessagesCount(business)
                const subtitle = businessRecentSubtitle(business, cooperativeId)
                return (
                  <li key={business.id}>
                    <button
                      type="button"
                      onClick={() => {
                        openBusinessViewAndGoToList(business, '/cooperativa/negocios')
                      }}
                      className="home-recent-item w-full text-left"
                    >
                      <div className="home-recent-item__main">
                        <p className="home-recent-item__title">
                          <span className="home-recent-item__code">{businessListTitle(business)}</span>
                          <span className="home-recent-item__type">
                            {businessTypeName(business.type)}
                          </span>
                        </p>
                        <p className="home-recent-item__meta">{subtitle}</p>
                      </div>
                      {unread > 0 && (
                        <span className="home-recent-item__badge" title="Mensagens não lidas">
                          {unread}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {!loading && !error && stats?.cafTotalSocios === 0 && (
        <div className="mt-6 rounded-2xl border border-green/15 bg-green/5 px-4 py-3 text-sm text-grey-dark">
          <span className="inline-flex items-center gap-2 font-medium text-green">
            <Percent size={16} />
            Dados CAF
          </span>
          <p className="mt-1">
            Ainda não há extrato CAF importado para sua cooperativa. Acesse{' '}
            <Link to="/cooperativa/caf" className="text-green font-medium hover:underline">
              Painel CAF
            </Link>{' '}
            para mais informações.
          </p>
        </div>
      )}
    </>
  )
}
