import { Check } from 'lucide-react'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatMoney, formatQty } from './format'

const DEFAULT_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

function MonthChips({ months, labels }: { months: number[]; labels: string[] }) {
  const sorted = [...months].sort((a, b) => a - b)
  if (!sorted.length) return <span className="is-muted">—</span>
  return (
    <span className="term-month-chips">
      {sorted.map((month) => (
        <span key={month} className="term-month-chip">{labels[month - 1]}</span>
      ))}
    </span>
  )
}

function MonthMark({ label }: { label: string }) {
  return (
    <span className="term-mark" role="img" aria-label={`Entrega em ${label}`}>
      <Check size={11} strokeWidth={3} />
    </span>
  )
}

export function TermDocumentTable({ term }: { term: CooperationTermDetail }) {
  const prices = term.model === 'STANDARD' && term.scope === 'full'
  const months = term.monthLabels.length ? term.monthLabels : DEFAULT_MONTHS
  const items = term.items.filter((item) => item.allocations.length > 0)
  const cooperatives = new Set(
    items.flatMap((item) => item.allocations.map((allocation) => allocation.cooperativeId)),
  ).size
  const totalValue = prices ? items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0) : null
  const columnCount = 7 + months.length + (prices ? 2 : 0)

  return (
    <section className="term-doc">
      <header className="term-doc__header">
        <div className="min-w-0">
          <p className="term-doc__brand">Organização comercial e logística · RedeCoop</p>
          <h2 className="term-doc__title">
            {term.name} — Processo {term.processNumber}
          </h2>
          <p className="term-doc__hint">Solicitamos o preenchimento conforme o interesse de participação.</p>
        </div>
        <dl className="term-doc__stats">
          <div className="term-doc__stat">
            <dt>Itens</dt>
            <dd>{items.length}</dd>
          </div>
          <div className="term-doc__stat">
            <dt>Cooperativas</dt>
            <dd>{cooperatives}</dd>
          </div>
          {totalValue !== null && (
            <div className="term-doc__stat">
              <dt>Valor total</dt>
              <dd>{formatMoney(totalValue)}</dd>
            </div>
          )}
        </dl>
      </header>

      <div className={`term-doc__content ${prices ? 'term-doc__content--prices' : 'term-doc__content--plain'}`}>
        <table className="term-doc-table">
          <thead>
            <tr>
              <th className="col-index">#</th>
              <th>Descrição do item</th>
              <th className="col-unit">Un</th>
              <th className="col-qty is-num">Quantidade estimada total</th>
              {prices && <th className="col-money is-num">Valor unitário</th>}
              {prices && <th className="col-money is-num">Valor total</th>}
              <th className="col-coop">Cooperativas</th>
              <th className="col-quota is-num">Quantidade p/ cotação</th>
              <th className="col-months">Meses de entrega</th>
              {months.map((month) => (
                <th key={month} className="col-month">{month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="is-muted">Nenhum item com cooperativa interessada.</td>
              </tr>
            )}
            {items.map((item) => {
              const rows = item.allocations
              return rows.map((allocation, rowIndex) => {
                const first = rowIndex === 0
                return (
                  <tr
                    key={`${item.id}-${allocation.cooperativeId}`}
                    className={first ? 'is-item-start' : undefined}
                  >
                    <td className="col-index is-muted">{first ? item.itemNumber : ''}</td>
                    <td className="term-doc-table__item">{first ? item.description : ''}</td>
                    <td className="col-unit">{first ? item.unit : ''}</td>
                    <td className="col-qty is-num">{first ? formatQty(item.estimatedQuantity) : ''}</td>
                    {prices && <td className="col-money is-num">{first ? formatMoney(item.unitPrice) : ''}</td>}
                    {prices && <td className="col-money is-num">{first ? formatMoney(item.totalPrice) : ''}</td>}
                    <td className="col-coop">{allocation.cooperativeName}</td>
                    <td className="col-quota is-num">{formatQty(allocation.quantity)}</td>
                    <td className="col-months">
                      <MonthChips months={allocation.months} labels={months} />
                    </td>
                    {months.map((label, monthIndex) => (
                      <td key={label} className="col-month">
                        {allocation.months.includes(monthIndex + 1) && <MonthMark label={label} />}
                      </td>
                    ))}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>

        <div className="term-doc-cards">
          {items.length === 0 && <p className="is-muted text-sm">Nenhum item com cooperativa interessada.</p>}
          {items.map((item) => (
            <article key={item.id} className="term-doc-card">
              <div className="term-doc-card__head">
                <span className="term-doc-card__index">{item.itemNumber}</span>
                <p className="term-doc-card__title">{item.description}</p>
              </div>
              <dl className="term-doc-card__meta">
                <div>
                  <dt>Quantidade estimada</dt>
                  <dd>{formatQty(item.estimatedQuantity)} {item.unit}</dd>
                </div>
                {prices && (
                  <div>
                    <dt>Valor unitário</dt>
                    <dd>{formatMoney(item.unitPrice)}</dd>
                  </div>
                )}
                {prices && (
                  <div>
                    <dt>Valor total</dt>
                    <dd>{formatMoney(item.totalPrice)}</dd>
                  </div>
                )}
              </dl>
              <ul className="term-doc-card__allocs">
                {item.allocations.map((allocation) => (
                  <li key={allocation.cooperativeId} className="term-doc-card__alloc">
                    <div className="term-doc-card__alloc-top">
                      <span>{allocation.cooperativeName}</span>
                      <span>{formatQty(allocation.quantity)} {item.unit}</span>
                    </div>
                    <MonthChips months={allocation.months} labels={months} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function DivisionSheet({ term }: { term: CooperationTermDetail }) {
  return (
    <section className="term-doc">
      <header className="term-doc__header">
        <div className="min-w-0">
          <p className="term-doc__brand">Planilha de divisão · somente leitura</p>
          <h2 className="term-doc__title">
            {term.name} — Processo {term.processNumber}
          </h2>
        </div>
      </header>
      <div className="term-sheet">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Descrição do item</th>
              <th>Un</th>
              <th>Quantidade estimada</th>
              <th>Cooperativa</th>
              <th>Quantidade da cota</th>
            </tr>
          </thead>
          <tbody>
            {term.items.map((item) => {
              const rows = item.allocations.length ? item.allocations : [null]
              return rows.map((allocation, rowIndex) => (
                <tr key={`${item.id}-${allocation?.cooperativeId ?? 'empty'}`}>
                  <td>{rowIndex === 0 ? item.itemNumber : ''}</td>
                  <td>{rowIndex === 0 ? item.description : ''}</td>
                  <td>{rowIndex === 0 ? item.unit : ''}</td>
                  <td>{rowIndex === 0 ? formatQty(item.estimatedQuantity) : ''}</td>
                  <td>{allocation?.cooperativeName ?? 'Sem cooperativas'}</td>
                  <td>{allocation ? formatQty(allocation.quantity) : '—'}</td>
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
