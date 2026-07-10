function formatCount(count: number) {
  return count > 99 ? '99+' : String(count)
}

interface NotifyBadgeProps {
  count: number
  className?: string
  variant?: 'inline' | 'floating'
  label?: string
}

export function NotifyBadge({
  count,
  className = '',
  variant = 'inline',
  label,
}: NotifyBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={`notify-badge notify-badge--${variant} ${className}`.trim()}
      aria-label={label ?? `${count} não lidas`}
      title={label ?? `${count} não lidas`}
    >
      {formatCount(count)}
    </span>
  )
}
