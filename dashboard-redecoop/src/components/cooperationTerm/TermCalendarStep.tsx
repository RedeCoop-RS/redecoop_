import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatQty, splitEven } from './format'

interface TermCalendarStepProps {
  term: CooperationTermDetail
  onChange: (term: CooperationTermDetail) => void
}

export function TermCalendarStep({ term, onChange }: TermCalendarStepProps) {
  const [marks, setMarks] = useState<Record<string, number[]>>(() => {
    const initial: Record<string, number[]> = {}
    term.items.forEach((item) => {
      item.allocations.forEach((allocation) => {
        initial[`${item.id}:${allocation.cooperativeId}`] = [...allocation.months]
      })
    })
    return initial
  })
  const [saving, setSaving] = useState(false)
  const months = term.monthLabels.length ? term.monthLabels : []

  const toggle = (key: string, month: number) => {
    setMarks((current) => {
      const list = current[key] ?? []
      const next = list.includes(month) ? list.filter((value) => value !== month) : [...list, month].sort((a, b) => a - b)
      return { ...current, [key]: next }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const entries = term.items.flatMap((item) =>
        item.allocations.map((allocation) => ({
          itemId: item.id,
          cooperativeId: allocation.cooperativeId,
          months: marks[`${item.id}:${allocation.cooperativeId}`] ?? [],
        })),
      )
      const updated = await cooperationTermService.setCalendar(term.id, entries)
      onChange(updated)
      toast.success('Calendário salvo.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar o calendário.')
    } finally {
      setSaving(false)
    }
  }

  const preview = (quantity: number, selected: number[]) => {
    const shares = splitEven(quantity, selected.length)
    if (!shares.length) return '—'
    const unique = [...new Set(shares)]
    return unique.map((share) => formatQty(share)).join(' / ')
  }

  return (
    <div className="space-y-4">
      <AlertBox alerts={term.alerts} />
      {!term.items.some((item) => item.allocations.length) && (
        <p className="text-sm text-grey-dark">A divisão precisa existir antes do calendário de entregas.</p>
      )}
      {term.items.map((item, index) => (
        <section key={item.id} className="panel-card">
          <div className="panel-card__header">
            <p className="font-semibold text-ink">
              {index + 1}. {item.description}
              <span className="ml-2 font-normal text-grey-dark">{formatQty(item.estimatedQuantity)} {item.unit}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table data-table--compact min-w-[980px]">
              <thead>
                <tr>
                  <th>Cooperativa</th>
                  <th>Cota</th>
                  {months.map((label) => (
                    <th key={label} className="text-center">{label}</th>
                  ))}
                  <th>Por mês</th>
                </tr>
              </thead>
              <tbody>
                {item.allocations.length === 0 && (
                  <tr>
                    <td colSpan={3 + months.length} className="text-grey-dark">Nenhuma cooperativa neste item.</td>
                  </tr>
                )}
                {item.allocations.map((allocation) => {
                  const key = `${item.id}:${allocation.cooperativeId}`
                  const selected = marks[key] ?? []
                  return (
                    <tr key={key}>
                      <td>{allocation.cooperativeName}</td>
                      <td>{formatQty(allocation.quantity)}</td>
                      {months.map((label, monthIndex) => {
                        const month = monthIndex + 1
                        const checked = selected.includes(month)
                        return (
                          <td key={label} className="text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              aria-label={`${label} de ${allocation.cooperativeName} em ${item.description}`}
                              onChange={() => toggle(key, month)}
                            />
                          </td>
                        )
                      })}
                      <td>{preview(allocation.quantity, selected)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>Salvar calendário</Button>
      </div>
    </div>
  )
}

export function AlertBox({ alerts }: { alerts: CooperationTermDetail['alerts'] }) {
  if (!alerts.length) {
    return (
      <p className="rounded-xl bg-green-soft px-4 py-3 text-sm text-green-dark">
        Nenhum alerta: os meses marcados têm fornecedor e as somas fecham com as cotas.
      </p>
    )
  }
  const visible = alerts.slice(0, 12)
  return (
    <div className="rounded-xl border border-yellow bg-yellow-soft px-4 py-3">
      <p className="text-sm font-semibold text-ink">{alerts.length} alerta{alerts.length === 1 ? '' : 's'}</p>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-ink">
        {visible.map((alert, index) => (
          <li key={`${alert.code}-${alert.itemId}-${alert.month ?? 0}-${alert.cooperativeId ?? 0}-${index}`}>{alert.message}</li>
        ))}
      </ul>
      {alerts.length > visible.length && (
        <p className="mt-2 text-xs text-grey-dark">E mais {alerts.length - visible.length} alerta(s).</p>
      )}
    </div>
  )
}
