import { useEffect, useState } from 'react'
import { Building2, Package, Users, UserCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { displayUserName } from '@/components/layout/UserMenu'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { ChartCard } from '@/components/charts/ChartCard'
import { graphService } from '@/services/graph.service'
import { cooperativeService } from '@/services/cooperative.service'
import { productService } from '@/services/product.service'
import { visitantService } from '@/services/misc.service'
import { CooperativeDashboard } from '@/components/home/CooperativeDashboard'
import type { GraphData } from '@/types'

interface ChartConfig {
  title: string
  type: 'column' | 'pie'
  loader: () => Promise<GraphData>
}

const adminCharts: ChartConfig[] = [
  {
    title: 'Cooperativas por município',
    type: 'column',
    loader: () => graphService.totalCooperativesByMunicipality(),
  },
  {
    title: 'Visitantes por município',
    type: 'column',
    loader: () => graphService.totalVisitantsByMunicipality(),
  },
  {
    title: 'Visitantes por tipo',
    type: 'pie',
    loader: () => graphService.totalVisitantsByType(),
  },
  {
    title: 'Categorias de produtos',
    type: 'pie',
    loader: () => graphService.totalProductCategories(),
  },
]

interface DashboardStats {
  cooperatives: number
  products: number
  visitants: number
}

export function HomePage() {
  const { user, isAdmin } = useAuth()
  const [charts, setCharts] = useState<{ title: string; type: 'column' | 'pie'; data: GraphData }[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(isAdmin)

  useEffect(() => {
    if (!isAdmin) return

    Promise.all([
      Promise.all(
        adminCharts.map(async (chart) => ({
          title: chart.title,
          type: chart.type,
          data: await chart.loader(),
        })),
      ),
      Promise.all([
        cooperativeService.list(1, 1),
        productService.listAdmin(1, 1),
        visitantService.list(1, 1),
      ]).then(([coops, products, visitants]) => ({
        cooperatives: coops.total,
        products: products.meta.totalItems ?? products.data.length,
        visitants: visitants.total,
      })),
    ])
      .then(([chartData, statsData]) => {
        setCharts(chartData)
        setStats(statsData)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [isAdmin])

  const displayName = user
    ? displayUserName(
        user.username,
        user.role,
        user.cooperative?.fantasyName ?? user.cooperative?.name,
      )
    : ''

  return (
    <div>
      <div className="home-hero mb-8">
        <div className="home-hero__stripe">
          <span />
          <span />
          <span />
        </div>
        <PageHeader
          kicker="Bem-vindo"
          title={`Olá, ${displayName}`}
          description={
            isAdmin
              ? 'Visão geral da rede cooperativista no Rio Grande do Sul.'
              : 'Gerencie produtos, negócios e viagens da sua cooperativa.'
          }
        />
      </div>

      {isAdmin && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cooperativas"
            value={stats?.cooperatives.toLocaleString('pt-BR') ?? '—'}
            icon={Building2}
            trend="Cadastradas na rede"
            variant="green"
            loading={loading}
          />
          <StatCard
            label="Produtos"
            value={stats?.products.toLocaleString('pt-BR') ?? '—'}
            icon={Package}
            trend="No catálogo global"
            variant="blue"
            loading={loading}
          />
          <StatCard
            label="Visitantes"
            value={stats?.visitants.toLocaleString('pt-BR') ?? '—'}
            icon={Users}
            trend="Solicitações ativas"
            variant="yellow"
            loading={loading}
          />
          <StatCard
            label="Painel"
            value="Admin"
            icon={UserCheck}
            trend="Acesso total"
            variant="mint"
          />
        </div>
      )}

      {!isAdmin && user?.cooperative?.id != null && (
        <CooperativeDashboard cooperativeId={user.cooperative.id} />
      )}

      {isAdmin && error && (
        <div className="mb-6 rounded-2xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          Não foi possível carregar os gráficos. Verifique a API e tente atualizar a página.
        </div>
      )}

      {isAdmin && loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="chart-card animate-pulse">
              <div className="h-14 bg-gray-100" />
              <div className="h-[300px] bg-gray-50" />
            </div>
          ))}
        </div>
      )}

      {isAdmin && !loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          {charts.map((chart) => (
            <ChartCard key={chart.title} title={chart.title} data={chart.data} type={chart.type} />
          ))}
        </div>
      )}
    </div>
  )
}
