import { useId, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GraphData } from '@/types'

const BAR_GREEN = '#009640'
const BAR_GREEN_SOFT = '#3dbe6c'

const PIE_COLORS = [
  '#009640',
  '#1d4ed8',
  '#f59e0b',
  '#0ea5a4',
  '#7c3aed',
  '#e11d48',
  '#64748b',
  '#84cc16',
  '#db2777',
  '#0369a1',
]

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
    return { rows: top, total: rows.reduce((s, r) => s + r.value, 0), truncated: true, cap: 12 }
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
      cap: 8,
    }
  }

  return {
    rows: rows.filter((r) => r.value > 0),
    total: rows.reduce((s, r) => s + r.value, 0),
    truncated: false,
    cap: rows.length,
  }
}

function shortenLabel(value: string, max = 16) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function ChartTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean
  payload?: { value: number; name: string; payload?: { name?: string } }[]
  label?: string
  total: number
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const name = label || item.payload?.name || item.name
  const value = item.value
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{name}</p>
      <p className="chart-tooltip__value">{value.toLocaleString('pt-BR')}</p>
      <p className="chart-tooltip__pct">{pct}% do total</p>
    </div>
  )
}

function ChartLegend({
  rows,
  total,
  activeIndex,
}: {
  rows: { name: string; value: number }[]
  total: number
  activeIndex?: number | null
}) {
  return (
    <ul className={`chart-legend${rows.length <= 3 ? ' chart-legend--compact' : ''}`}>
      {rows.map((row, index) => {
        const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0'
        return (
          <li
            key={row.name}
            className={`chart-legend__item${activeIndex === index ? ' chart-legend__item--active' : ''}`}
          >
            <span
              className="chart-legend__dot"
              style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
            />
            <span className="chart-legend__name" title={row.name}>
              {row.name}
            </span>
            <span className="chart-legend__meta">
              {row.value.toLocaleString('pt-BR')}
              <em>{pct}%</em>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function DonutBlock({
  chartData,
  total,
}: {
  chartData: { name: string; value: number }[]
  total: number
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const slice = activeIndex != null ? chartData[activeIndex] : null
  const value = slice?.value ?? total
  const pct = slice && total > 0 ? ((slice.value / total) * 100).toFixed(1) : null

  return (
    <div className="chart-card__pie-layout">
      <div className="chart-card__donut">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={3}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                  opacity={activeIndex == null || activeIndex === index ? 1 : 0.45}
                  style={{ cursor: 'pointer', outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-card__donut-center">
          <strong>{value.toLocaleString('pt-BR')}</strong>
          <span>{slice?.name ?? 'total'}</span>
          {pct && <em>{pct}%</em>}
        </div>
      </div>
      <ChartLegend rows={chartData} total={total} activeIndex={activeIndex} />
    </div>
  )
}

interface ChartCardProps {
  title: string
  data: GraphData
  type?: 'column' | 'pie'
  subtitle?: string
}

export function ChartCard({ title, data, type = 'column', subtitle }: ChartCardProps) {
  const gradientId = `chart-bar-${useId().replace(/:/g, '')}`
  const pieMode = type === 'pie' || isPieData(data.data)
  const { rows: chartData, total, truncated, cap } = buildChartRows(data, pieMode)
  const isEmpty = chartData.length === 0
  const useHorizontal = !pieMode && chartData.length > 5
  const defaultSubtitle = truncated
    ? `Top ${cap} de ${total.toLocaleString('pt-BR')}`
    : `${total.toLocaleString('pt-BR')} no total`

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          <p className="chart-card__subtitle">{subtitle ?? defaultSubtitle}</p>
        </div>
        {!isEmpty && <span className="chart-card__total">{total.toLocaleString('pt-BR')}</span>}
      </div>
      <div className={`chart-card__body${pieMode ? ' chart-card__body--pie' : ''}`}>
        {isEmpty ? (
          <div className="chart-card__empty">Sem dados para exibir</div>
        ) : pieMode ? (
          <DonutBlock chartData={chartData} total={total} />
        ) : useHorizontal ? (
          <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 34)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={BAR_GREEN} />
                  <stop offset="100%" stopColor={BAR_GREEN_SOFT} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#6b6b6b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                tick={{ fontSize: 11, fill: '#1a1a2e' }}
                tickFormatter={(value: string) => shortenLabel(value)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip total={total} />} cursor={{ fill: 'rgba(0,150,64,0.06)' }} />
              <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[0, 7, 7, 0]} barSize={16}>
                <LabelList
                  dataKey="value"
                  position="right"
                  fontSize={11}
                  fontWeight={700}
                  fill="#3d4a42"
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value ?? '')
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 18, right: 8, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BAR_GREEN_SOFT} />
                  <stop offset="100%" stopColor={BAR_GREEN} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b6b6b' }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={chartData.length > 4 ? -28 : 0}
                textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                height={chartData.length > 4 ? 56 : 32}
                tickFormatter={(value: string) => shortenLabel(value, 12)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b6b6b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip total={total} />} cursor={{ fill: 'rgba(0,150,64,0.06)' }} />
              <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[8, 8, 0, 0]} maxBarSize={44}>
                <LabelList
                  dataKey="value"
                  position="top"
                  fontSize={11}
                  fontWeight={700}
                  fill="#3d4a42"
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value ?? '')
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
