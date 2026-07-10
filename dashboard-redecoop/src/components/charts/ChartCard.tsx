import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GraphData } from '@/types'

const BAR_COLORS = ['#009640', '#007a35', '#92d0b2', '#ffd300', '#4ade80', '#22c55e', '#86efac', '#fbbf24']

/** Paleta vibrante para pizzas — rótulos externos com linhas coloridas */
const PIE_COLORS = [
  '#3b4cb8',
  '#52b943',
  '#5b7c99',
  '#5eb3e8',
  '#2db5a8',
  '#a855c8',
  '#f59e34',
  '#e5484d',
  '#009640',
  '#7c3aed',
  '#06b6d4',
  '#ec4899',
]

const RADIAN = Math.PI / 180

function renderPieLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  percent?: number
  name?: string
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = '' } = props
  if (percent < 0.03) return null

  const radius = outerRadius + 26
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#1a1a2e"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${name}: ${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { fill?: string } }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{item.name}</p>
      <p className="chart-tooltip__value">{item.value.toLocaleString('pt-BR')}</p>
    </div>
  )
}

interface ChartCardProps {
  title: string
  data: GraphData
  type?: 'column' | 'pie'
  subtitle?: string
}

function isPieData(data: GraphData['data']): data is { name: string; y: number }[] {
  return data.length > 0 && typeof data[0] === 'object' && 'name' in data[0]
}

function buildChartRows(data: GraphData, pieMode: boolean) {
  const rows = pieMode
    ? (data.data as { name: string; y: number }[]).map((d) => ({
        name: d.name,
        value: d.y,
      }))
    : (data.categories ?? []).map((cat, i) => ({
        name: cat,
        value: (data.data as number[])[i] ?? 0,
      }))

  if (!pieMode && rows.length > 12) {
    const sorted = [...rows].sort((a, b) => b.value - a.value)
    const top = sorted.slice(0, 12)
    const rest = sorted.slice(12).reduce((sum, r) => sum + r.value, 0)
    if (rest > 0) top.push({ name: 'Outros', value: rest })
    return { rows: top, total: rows.reduce((s, r) => s + r.value, 0), truncated: true }
  }

  if (pieMode && rows.length > 8) {
    const sorted = [...rows].sort((a, b) => b.value - a.value)
    const top = sorted.slice(0, 8)
    const rest = sorted.slice(8).reduce((sum, r) => sum + r.value, 0)
    if (rest > 0) top.push({ name: 'Outros', value: rest })
    return {
      rows: top.filter((r) => r.value > 0),
      total: rows.reduce((s, r) => s + r.value, 0),
      truncated: true,
    }
  }

  return {
    rows: pieMode ? rows.filter((r) => r.value > 0) : rows.filter((r) => r.value > 0),
    total: rows.reduce((s, r) => s + r.value, 0),
    truncated: false,
  }
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label ?? payload[0].name}</p>
      <p className="chart-tooltip__value">{payload[0].value.toLocaleString('pt-BR')}</p>
    </div>
  )
}

export function ChartCard({ title, data, type = 'column', subtitle }: ChartCardProps) {
  const pieMode = type === 'pie' || isPieData(data.data)
  const { rows: chartData, total, truncated } = buildChartRows(data, pieMode)
  const isEmpty = chartData.length === 0
  const useHorizontal = !pieMode && chartData.length > 6

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {(subtitle || truncated) && (
            <p className="chart-card__subtitle">
              {subtitle ??
                (truncated
                  ? `Top 12 de ${total.toLocaleString('pt-BR')} registros`
                  : `${total.toLocaleString('pt-BR')} no total`)}
            </p>
          )}
        </div>
        {!isEmpty && (
          <span className="chart-card__total">{total.toLocaleString('pt-BR')}</span>
        )}
      </div>
      <div className={`chart-card__body${pieMode ? ' chart-card__body--pie' : ''}`}>
        {isEmpty ? (
          <div className="chart-card__empty">Sem dados para exibir</div>
        ) : pieMode ? (
          <ResponsiveContainer width="100%" height={Math.max(340, chartData.length * 36)}>
            <PieChart margin={{ top: 28, right: 56, bottom: 28, left: 56 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={chartData.length > 6 ? 78 : 96}
                paddingAngle={0}
                stroke="#fff"
                strokeWidth={2}
                label={renderPieLabel}
                labelLine={{
                  strokeWidth: 1.5,
                }}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : useHorizontal ? (
          <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 32)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fill: '#1a1a2e' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,150,64,0.06)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b6b6b' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={chartData.length > 4 ? -30 : 0}
                textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                height={chartData.length > 4 ? 56 : 32}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b6b6b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,150,64,0.06)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
