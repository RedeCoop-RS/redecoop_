import type { ReactNode } from 'react'

interface CafScrollTableProps {
  title: string
  subtitle?: string
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; width?: string }[]
  children: ReactNode
  footer?: ReactNode
}

export function CafScrollTable({ title, subtitle, columns, children, footer }: CafScrollTableProps) {
  return (
    <div className="caf-panel-card panel-card">
      <div className="caf-panel-card__header panel-card__header">
        <div>
          <p className="caf-panel-card__title">{title}</p>
          {subtitle && <p className="caf-panel-card__subtitle">{subtitle}</p>}
        </div>
        {footer}
      </div>
      <div className="caf-aggregate-wrap">
        <table className="caf-scroll-table data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === 'right' ? 'caf-scroll-table__num' : col.align === 'center' ? 'caf-scroll-table__center' : undefined}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
