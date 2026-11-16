import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatMoney, formatQty } from './format'

export function TermDocumentTable({ term }: { term: CooperationTermDetail }) {
  const prices = term.model === 'STANDARD' && term.scope === 'full'
  const months = term.monthLabels.length ? term.monthLabels : ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

  return (
    <div className="panel-card">
      <div className="panel-card__header">
        <div>
          <p className="text-sm font-semibold text-green-dark">Organização comercial e logística: RedeCoop</p>
          <p className="mt-1 text-xs font-normal text-grey-dark">Solicitamos o preenchimento conforme o interesse de participação.</p>
          <p className="mt-2 text-base font-semibold text-ink">
            {term.name} — Processo {term.processNumber}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table data-table--compact min-w-[1100px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Descrição do item</th>
              <th>Un</th>
              <th>Quantidade estimada total</th>
              {prices && <th>Valor unitário</th>}
              {prices && <th>Valor total</th>}
              <th>Cooperativas</th>
              <th>Quantidade p/ cotação</th>
              {months.map((month) => (
                <th key={month} className="text-center">{month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {term.items.length === 0 && (
              <tr>
                <td colSpan={8 + months.length + (prices ? 2 : 0)} className="text-grey-dark">
                  Nenhum item cadastrado.
                </td>
              </tr>
            )}
            {term.items.map((item, index) => {
              const rows = item.allocations.length ? item.allocations : [null]
              return rows.map((allocation, rowIndex) => (
                <tr key={`${item.id}-${allocation?.cooperativeId ?? 'empty'}`}>
                  <td>{rowIndex === 0 ? index + 1 : ''}</td>
                  <td className="max-w-xs whitespace-normal">{rowIndex === 0 ? item.description : ''}</td>
                  <td>{rowIndex === 0 ? item.unit : ''}</td>
                  <td>{rowIndex === 0 ? formatQty(item.estimatedQuantity) : ''}</td>
                  {prices && <td>{rowIndex === 0 ? formatMoney(item.unitPrice) : ''}</td>}
                  {prices && <td>{rowIndex === 0 ? formatMoney(item.totalPrice) : ''}</td>}
                  <td>{allocation?.cooperativeName ?? ''}</td>
                  <td>{allocation ? formatQty(allocation.quantity) : ''}</td>
                  {months.map((_, monthIndex) => {
                    const marked = allocation?.months.includes(monthIndex + 1)
                    return (
                      <td key={monthIndex} className="text-center font-semibold text-green-dark">
                        {marked ? 'X' : ''}
                      </td>
                    )
                  })}
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DivisionSheet({ term }: { term: CooperationTermDetail }) {
  return (
    <div className="panel-card">
      <div className="panel-card__header">
        <div>
          <p className="text-base font-semibold text-ink">Planilha de divisão</p>
          <p className="mt-1 text-sm text-grey-dark">
            {term.name} — Processo {term.processNumber}. Somente leitura.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[720px]">
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
            {term.items.map((item, index) => {
              const rows = item.allocations.length ? item.allocations : [null]
              return rows.map((allocation, rowIndex) => (
                <tr key={`${item.id}-${allocation?.cooperativeId ?? 'empty'}`}>
                  <td>{rowIndex === 0 ? index + 1 : ''}</td>
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
    </div>
  )
}
