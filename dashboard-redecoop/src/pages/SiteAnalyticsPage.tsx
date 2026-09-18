import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Clock3,
  Eye,
  Flame,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { ChartCard } from '@/components/charts/ChartCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { HeatmapCanvas } from '@/components/analytics/HeatmapCanvas'
import { siteAnalyticsService, type SiteAnalyticsRange } from '@/services/site-analytics.service'
import type {
  GraphData,
  SiteAnalyticsHeatmap,
  SiteAnalyticsOverview,
  SiteAnalyticsPageRow,
  SiteAnalyticsTimeseriesPoint,
} from '@/types'

type PeriodId = 'today' | '7d' | '30d' | 'month'

const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/historia': 'Nossa História',
  '/governanca': 'Governança',
  '/servicos': 'Serviços',
  '/cooperativismo-de-plataforma': 'Cooperativismo de Plataforma',
  '/cooperativas': 'Cooperativas',
  '/blog': 'Blog',
  '/contato': 'Contato',
  '/privacidade': 'Privacidade',
}

function ymd(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function rangeFor(period: PeriodId): SiteAnalyticsRange {
  const now = new Date()
  const to = ymd(now)
  if (period === 'today') return { from: to, to }
  if (period === '7d') {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    return { from: ymd(from), to }
  }
  if (period === 'month') {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to }
  }
  const from = new Date(now)
  from.setDate(from.getDate() - 29)
  return { from: ymd(from), to }
}

function pageLabel(path: string) {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path]
  if (path.startsWith('/blog/')) return `Blog · ${decodeURIComponent(path.slice(6))}`
  return path
}

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function formatDay(iso: string) {
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export function SiteAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodId>('30d')
  const range = useMemo(() => rangeFor(period), [period])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [overview, setOverview] = useState<SiteAnalyticsOverview | null>(null)
  const [pages, setPages] = useState<SiteAnalyticsPageRow[]>([])
  const [series, setSeries] = useState<SiteAnalyticsTimeseriesPoint[]>([])
  const [heatmap, setHeatmap] = useState<SiteAnalyticsHeatmap | null>(null)
  const [heatPath, setHeatPath] = useState('/')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [overviewData, pagesData, seriesData] = await Promise.all([
        siteAnalyticsService.overview(range),
        siteAnalyticsService.pages(range),
        siteAnalyticsService.timeseries(range),
      ])
      setOverview(overviewData)
      setPages(pagesData)
      setSeries(seriesData)
      const nextPath = pagesData.some((p) => p.path === heatPath)
        ? heatPath
        : pagesData[0]?.path ?? '/'
      setHeatPath(nextPath)
      setHeatmap(await siteAnalyticsService.heatmap(range, nextPath))
    } catch {
      setError(true)
      setOverview(null)
      setPages([])
      setSeries([])
      setHeatmap(null)
    } finally {
      setLoading(false)
    }
  }, [range, heatPath])

  useEffect(() => {
    void load()
    // load intentionally depends on period range; heatPath is applied after pages load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const onHeatPath = async (path: string) => {
    setHeatPath(path)
    try {
      setHeatmap(await siteAnalyticsService.heatmap(range, path))
    } catch {
      setHeatmap(null)
    }
  }

  const maxViews = Math.max(...pages.map((p) => p.views), 1)
  const maxTime = Math.max(...pages.map((p) => p.totalDurationMs), 1)
  const deviceGraph: GraphData = {
    categories: [],
    data: overview?.devices ?? [],
  }

  const scrollTotal = heatmap?.scroll.views ?? 0
  const scrollRows = heatmap
    ? [
        { label: '25%', value: heatmap.scroll.reached25 },
        { label: '50%', value: heatmap.scroll.reached50 },
        { label: '75%', value: heatmap.scroll.reached75 },
        { label: '90%', value: heatmap.scroll.reached90 },
      ]
    : []

  return (
    <div className="site-analytics">
      <PageHeader
        kicker="Site público"
        title="Audiência e mapa de calor"
        description="Quem entra em redecooprs.com.br, quais telas mais acessam e onde passam mais tempo."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} />
            Atualizar
          </Button>
        }
      />

      <div className="site-analytics__periods">
        {(
          [
            ['today', 'Hoje'],
            ['7d', '7 dias'],
            ['30d', '30 dias'],
            ['month', 'Este mês'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`site-analytics__period${period === id ? ' is-active' : ''}`}
            onClick={() => setPeriod(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          Não deu para carregar o analytics. Rode a migration da API e tente de novo.
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pessoas agora"
          value={overview?.liveVisitors.toLocaleString('pt-BR') ?? '—'}
          icon={Eye}
          trend="Ativas nos últimos 5 min"
          variant="green"
          loading={loading}
        />
        <StatCard
          label="Visitantes"
          value={overview?.visitors.toLocaleString('pt-BR') ?? '—'}
          icon={Users}
          trend="Visitantes únicos no período"
          variant="blue"
          loading={loading}
        />
        <StatCard
          label="Sessões"
          value={overview?.sessions.toLocaleString('pt-BR') ?? '—'}
          icon={MousePointerClick}
          trend={`${overview?.pageViews.toLocaleString('pt-BR') ?? '0'} visualizações`}
          variant="mint"
          loading={loading}
        />
        <StatCard
          label="Tempo médio"
          value={overview ? formatDuration(overview.avgDurationMs) : '—'}
          icon={Clock3}
          trend={`Scroll médio ${overview?.avgScrollPct ?? 0}%`}
          variant="yellow"
          loading={loading}
        />
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <h3 className="chart-card__title">Visitantes por dia</h3>
              <p className="chart-card__subtitle">Entradas no site e telas vistas</p>
            </div>
          </div>
          <div className="chart-card__body" style={{ height: 300 }}>
            {series.length === 0 ? (
              <div className="chart-card__empty">Sem dados para exibir</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="siteVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#009640" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#009640" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDay}
                    tick={{ fontSize: 11, fill: '#6b6b6b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b6b6b' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value).toLocaleString('pt-BR'),
                      name === 'visitors' ? 'Visitantes' : 'Telas vistas',
                    ]}
                    labelFormatter={(label) => formatDay(String(label))}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#009640"
                    fill="url(#siteVisitors)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    stroke="#1d4ed8"
                    fill="none"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <ChartCard title="Dispositivos" data={deviceGraph} type="pie" subtitle="Sessões no período" />
      </div>

      <section className="mb-8">
        <div className="panel-card">
          <div className="panel-card__header">
            <span>Telas mais acessadas</span>
            <span className="text-xs font-medium text-grey">Calor = volume de visitas</span>
          </div>
          {pages.length === 0 ? (
            <div className="panel-card__body">
              <EmptyState
                icon={<Flame size={28} />}
                title="Ainda sem tráfego neste período"
                description="Abra o site público e navegue nas páginas. Os dados aparecem aqui em alguns segundos."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tela</th>
                    <th>Visitas</th>
                    <th>Pessoas</th>
                    <th>Tempo médio</th>
                    <th>Tempo total</th>
                    <th>Scroll</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((row) => (
                    <tr
                      key={row.path}
                      className={heatPath === row.path ? 'site-analytics__row--active' : undefined}
                    >
                      <td>
                        <button
                          type="button"
                          className="site-analytics__page"
                          onClick={() => void onHeatPath(row.path)}
                        >
                          <strong>{pageLabel(row.path)}</strong>
                          <span>{row.path}</span>
                          <span
                            className="site-analytics__heatbar"
                            style={{ width: `${Math.max(8, (row.views / maxViews) * 100)}%` }}
                          />
                        </button>
                      </td>
                      <td>{row.views.toLocaleString('pt-BR')}</td>
                      <td>{row.visitors.toLocaleString('pt-BR')}</td>
                      <td>{formatDuration(row.avgDurationMs)}</td>
                      <td>
                        <span
                          className="site-analytics__timechip"
                          style={{
                            background: `rgba(0,150,64,${0.08 + (row.totalDurationMs / maxTime) * 0.22})`,
                          }}
                        >
                          {formatDuration(row.totalDurationMs)}
                        </span>
                      </td>
                      <td>{row.avgScrollPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="site-heat">
        <div className="site-heat__map panel-card">
          <div className="panel-card__header">
            <span>Mapa de calor · {pageLabel(heatPath)}</span>
            <span className="text-xs font-medium text-grey">
              {heatmap?.totalClicks.toLocaleString('pt-BR') ?? 0} cliques
            </span>
          </div>
          <div className="site-heat__body">
            <HeatmapCanvas cells={heatmap?.cells ?? []} />
            <div className="site-heat__legend">
              <span>Frio</span>
              <i />
              <span>Quente</span>
            </div>
            <p className="site-heat__hint">
              Quanto mais vermelho, mais as pessoas clicam naquela região da página — topo, meio ou
              rodapé.
            </p>
          </div>
        </div>

        <div className="site-heat__side">
          <div className="panel-card">
            <div className="panel-card__header">Escolher tela</div>
            <div className="panel-card__body site-heat__paths">
              {(pages.length ? pages : [{ path: '/', views: 0 } as SiteAnalyticsPageRow]).map(
                (row) => (
                  <button
                    key={row.path}
                    type="button"
                    className={`site-heat__path${heatPath === row.path ? ' is-active' : ''}`}
                    onClick={() => void onHeatPath(row.path)}
                  >
                    {pageLabel(row.path)}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card__header">Até onde rolam</div>
            <div className="panel-card__body">
              {scrollTotal === 0 ? (
                <p className="text-sm text-grey-dark">Sem scroll registrado nesta tela ainda.</p>
              ) : (
                <ul className="site-scroll">
                  {scrollRows.map((row) => {
                    const pct = Math.round((row.value / scrollTotal) * 100)
                    return (
                      <li key={row.label}>
                        <div className="site-scroll__meta">
                          <span>Chegaram a {row.label}</span>
                          <strong>{pct}%</strong>
                        </div>
                        <div className="site-scroll__track">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="mt-4 flex items-center gap-2 text-xs text-grey">
                <Smartphone size={14} />
                Base: {scrollTotal.toLocaleString('pt-BR')} visualizações desta tela
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
