import type { ReactNode } from 'react'

interface PageHeaderProps {
  kicker?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ kicker, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {kicker && <p className="page-kicker mb-1.5">{kicker}</p>}
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-grey-dark">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
