import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Info, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useModal } from '@/contexts/ModalContext'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatQty, splitEven, suggestRotation } from './format'

interface TermCalendarStepProps {
  term: CooperationTermDetail
  onChange: (term: CooperationTermDetail) => void
}

type CalendarItem = CooperationTermDetail['items'][number]

const markKey = (itemId: number, cooperativeId: number) => `${itemId}:${cooperativeId}`

function initialMarks(term: CooperationTermDetail): Record<string, number[]> {
  const initial: Record<string, number[]> = {}
  term.items.forEach((item) => {
    item.allocations.forEach((allocation) => {
      initial[markKey(item.id, allocation.cooperativeId)] = [...allocation.months].sort((a, b) => a - b)
    })
  })
  return initial
}

export function TermCalendarStep({ term, onChange }: TermCalendarStepProps) {
  const { confirm } = useModal()
  const [saved, setSaved] = useState(() => initialMarks(term))
  const [marks, setMarks] = useState<Record<string, number[]>>(saved)
  const [saving, setSaving] = useState(false)
  const months = term.monthLabels.length ? term.monthLabels : []
  const dirty = useMemo(() => JSON.stringify(marks) !== JSON.stringify(saved), [marks, saved])

  const marksOf = (item: CalendarItem, cooperativeId: number) => marks[markKey(item.id, cooperativeId)] ?? []
  const itemHasMarks = (item: CalendarItem) => item.allocations.some((allocation) => marksOf(item, allocation.cooperativeId).length)

  const applyRotation = (current: Record<string, number[]>, item: CalendarItem) => {
    const suppliers = item.allocations.filter((allocation) => allocation.quantity > 0)
    const plan = suggestRotation(suppliers.length)
    const next = { ...current }
    item.allocations.forEach((allocation) => {
      next[markKey(item.id, allocation.cooperativeId)] = []
    })
    suppliers.forEach((allocation, index) => {
      next[markKey(item.id, allocation.cooperativeId)] = plan[index]
    })
    return next
  }

  const suggestItem = async (item: CalendarItem) => {
    if (itemHasMarks(item)) {
      const ok = await confirm({
        title: 'Sugerir rodízio',
        message: `Os meses marcados em "${item.description}" serão trocados por um rodízio entre as cooperativas. Você pode ajustar antes de salvar.`,
        confirmLabel: 'Sugerir rodízio',
      })
      if (!ok) return
    }
    setMarks((current) => applyRotation(current, item))
  }

  const suggestEmpty = () => {
    const targets = term.items.filter((item) => item.allocations.length > 0 && !itemHasMarks(item))
    if (!targets.length) {
      toast('Todos os itens já têm meses marcados.')
      return
    }
    setMarks((current) => targets.reduce((next, item) => applyRotation(next, item), current))
    toast.success(`Rodízio sugerido em ${targets.length} ${targets.length === 1 ? 'item' : 'itens'}. Confira e salve.`)
  }

  const fillYear = (item: CalendarItem, cooperativeId: number) => {
    const key = markKey(item.id, cooperativeId)
    setMarks((current) => ({
      ...current,
      [key]: (current[key] ?? []).length === 12 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    }))
  }

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
      const fresh = initialMarks(updated)
      setSaved(fresh)
      setMarks(fresh)
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

  const hasDivision = term.items.some((item) => item.allocations.length)

  return (
    <div className="space-y-4">
      {!hasDivision && (
        <div className="term-notice term-notice--warn">
          <span className="term-notice__icon">
            <Info size={18} />
          </span>
          <div>
            <p className="term-notice__title">Divisão pendente</p>
            <p className="term-notice__text">A divisão precisa existir antes do calendário de entregas.</p>
          </div>
        </div>
      )}
      {hasDivision && (
        <div className="term-calendar-toolbar">
          <p>
            Marque os meses em que cada cooperativa tem condições de fornecer. Para começar, o sistema sugere um rodízio:
            um fornecedor por mês e os meses divididos por igual.
          </p>
          <Button variant="secondary" onClick={suggestEmpty}>
            <Shuffle size={16} /> Sugerir rodízio nos itens vazios
          </Button>
        </div>
      )}
      {term.items.filter((item) => item.allocations.length > 0).map((item) => (
        <section key={item.id} className="panel-card">
          <div className="panel-card__header">
            <p className="font-semibold text-ink">
              {item.itemNumber}. {item.description}
              <span className="ml-2 font-normal text-grey-dark">{formatQty(item.estimatedQuantity)} {item.unit}</span>
            </p>
            <Button variant="ghost" onClick={() => void suggestItem(item)}>
              <Shuffle size={16} /> Sugerir rodízio
            </Button>
          </div>
          <div className="term-sheet">
            <table className="data-table data-table--compact">
              <thead>
                <tr>
                  <th className="w-52">Cooperativa</th>
                  <th className="w-20">Cota</th>
                  {months.map((label) => (
                    <th key={label} className="term-sheet__month">{label}</th>
                  ))}
                  <th className="w-24">Por mês</th>
                </tr>
              </thead>
              <tbody>
                {item.allocations.length === 0 && (
                  <tr>
                    <td colSpan={3 + months.length} className="text-grey-dark">Nenhuma cooperativa neste item.</td>
                  </tr>
                )}
                {item.allocations.map((allocation) => {
                  const key = markKey(item.id, allocation.cooperativeId)
                  const selected = marks[key] ?? []
                  return (
                    <tr key={key}>
                      <td>
                        <span className="term-calendar-coop">
                          {allocation.cooperativeName}
                          <button
                            type="button"
                            className="term-calendar-year"
                            onClick={() => fillYear(item, allocation.cooperativeId)}
                          >
                            {selected.length === 12 ? 'Limpar' : 'Ano todo'}
                          </button>
                        </span>
                      </td>
                      <td>{formatQty(allocation.quantity)}</td>
                      {months.map((label, monthIndex) => {
                        const month = monthIndex + 1
                        const checked = selected.includes(month)
                        return (
                          <td key={label} className="term-sheet__month">
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
              <tfoot>
                <tr className="term-coverage">
                  <td colSpan={2}>Fornecedores no mês</td>
                  {months.map((label, monthIndex) => {
                    const count = item.allocations.filter(
                      (allocation) => allocation.quantity > 0 && marksOf(item, allocation.cooperativeId).includes(monthIndex + 1),
                    ).length
                    const tone = count === 0 ? 'empty' : count === 1 ? 'ok' : 'over'
                    return (
                      <td key={label} className="term-sheet__month">
                        <span
                          className={`term-coverage__count term-coverage__count--${tone}`}
                          title={count === 0 ? `${label} sem fornecedor` : `${count} em ${label}`}
                        >
                          {count === 0 ? '—' : count === 1 ? <Check size={11} strokeWidth={3} /> : count}
                        </span>
                      </td>
                    )
                  })}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ))}
      <div className="term-calendar-save">
        {dirty && <span>Há alterações não salvas no calendário.</span>}
        <Button onClick={save} disabled={saving || !dirty}>Salvar calendário</Button>
      </div>
    </div>
  )
}
