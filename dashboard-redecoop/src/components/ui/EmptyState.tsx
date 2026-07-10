import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({
  title = 'Nenhum registro encontrado',
  description = 'Quando houver dados disponíveis, eles aparecerão aqui.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-soft text-green">
        {icon ?? <Inbox size={28} />}
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
      {action}
    </div>
  )
}
