import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  variant?: 'green' | 'blue' | 'yellow' | 'mint'
  loading?: boolean
}

const VARIANTS = {
  green: 'stat-card--green',
  blue: 'stat-card--blue',
  yellow: 'stat-card--yellow',
  mint: 'stat-card--mint',
} as const

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = 'green',
  loading = false,
}: StatCardProps) {
  return (
    <div className={`stat-card ${VARIANTS[variant]}`}>
      <div className="stat-card__glow" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="stat-card__label">{label}</p>
          {loading ? (
            <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-gray-200" />
          ) : (
            <p className="stat-card__value">{value}</p>
          )}
          {trend && !loading && <p className="stat-card__trend">{trend}</p>}
        </div>
        <div className="stat-card__icon">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
