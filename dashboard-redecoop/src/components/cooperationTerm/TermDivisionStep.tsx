import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { useModal } from '@/contexts/ModalContext'
import { formatQty, parseQty, sumsMatch } from './format'

interface TermDivisionStepProps {
  term: CooperationTermDetail
  onChange: (term: CooperationTermDetail) => void
}

export function TermDivisionStep({ term, onChange }: TermDivisionStepProps) {
  const { confirm } = useModal()
  const [caps, setCaps] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    term.items.forEach((item) => {
      item.allocations.forEach((allocation) => {
        initial[`${item.id}:${allocation.cooperativeId}`] =
          allocation.maxCapacity === null ? '' : String(allocation.maxCapacity).replace('.', ',')
      })
    })
    return initial
  })
  const [saving, setSaving] = useState(false)

  const apply = async () => {
    const entries = term.items.flatMap((item) =>
      item.allocations.map((allocation) => {
        const raw = caps[`${item.id}:${allocation.cooperativeId}`] ?? ''
        return {
          itemId: item.id,
          cooperativeId: allocation.cooperativeId,
          maxCapacity: raw.trim() ? parseQty(raw) : null,
        }
      }),
    )
    if (entries.some((entry) => entry.maxCapacity === null && (caps[`${entry.itemId}:${entry.cooperativeId}`] ?? '').trim())) {
      toast.error('Há uma capacidade inválida. Use número maior ou igual a zero, ou deixe em branco para sem teto.')
      return
    }
    setSaving(true)
    try {
      const updated = await cooperationTermService.setCapacities(term.id, entries)
      onChange(updated)
      toast.success('Divisão recalculada.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível recalcular a divisão.')
    } finally {
      setSaving(false)
    }
  }

  const release = async (released: boolean) => {
    const ok = await confirm({
      title: released ? 'Liberar planilha' : 'Ocultar planilha',
      message: released
        ? 'As cooperativas participantes poderão ver esta divisão, somente leitura. O restante do rascunho continua oculto.'
        : 'As cooperativas deixam de ver a divisão deste rascunho.',
      confirmLabel: released ? 'Liberar' : 'Ocultar',
    })
    if (!ok) return
    try {
      onChange(await cooperationTermService.releaseDivision(term.id, released))
      toast.success(released ? 'Planilha liberada para as cooperativas.' : 'Planilha oculta.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível atualizar a liberação.')
    }
  }

  const hasInterest = term.items.some((item) => item.allocations.length > 0)

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-green/20 bg-green-soft px-4 py-3 text-sm text-ink">
        A quantidade de cada item é dividida em partes iguais. Se uma cooperativa informa um teto menor que a cota,
        fica com esse teto e o saldo é redistribuído igualmente entre as demais. Exemplo: 900 kg em três cotas de 300;
        se uma só pode 200, as outras duas ficam com 350.
      </section>

      {!hasInterest && (
        <p className="text-sm text-grey-dark">Marque o interesse das cooperativas para gerar a divisão.</p>
      )}

      <div className="panel-card">
        <div className="overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>Item</th>
              <th>Total</th>
              <th>Cooperativa</th>
              <th>Cota</th>
              <th>Capacidade máxima</th>
            </tr>
          </thead>
          <tbody>
            {term.items.map((item) => {
              const closed = sumsMatch(item.estimatedQuantity, item.allocations.map((allocation) => allocation.quantity))
              const rows = item.allocations.length ? item.allocations : [null]
              return rows.map((allocation, index) => (
                <tr key={`${item.id}-${allocation?.cooperativeId ?? 'empty'}`}>
                  <td>{index === 0 ? item.description : ''}</td>
                  <td>
                    {index === 0 && (
                      <span className={closed ? '' : 'font-semibold text-red'}>
                        {formatQty(item.estimatedQuantity)}
                        {!closed && item.allocations.length > 0 ? ' · soma não fecha' : ''}
                      </span>
                    )}
                  </td>
                  <td>{allocation?.cooperativeName ?? '—'}</td>
                  <td>{allocation ? formatQty(allocation.quantity) : '—'}</td>
                  <td>
                    {allocation && (
                      <input
                        aria-label={`Capacidade máxima de ${allocation.cooperativeName} em ${item.description}`}
                        className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green"
                        inputMode="decimal"
                        placeholder="Sem teto"
                        value={caps[`${item.id}:${allocation.cooperativeId}`] ?? ''}
                        onChange={(event) => setCaps({
                          ...caps,
                          [`${item.id}:${allocation.cooperativeId}`]: event.target.value,
                        })}
                      />
                    )}
                  </td>
                </tr>
              ))
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => release(!term.divisionReleased)}
        >
          {term.divisionReleased ? 'Ocultar planilha das cooperativas' : 'Liberar planilha para as cooperativas'}
        </Button>
        <Button onClick={apply} disabled={saving || !hasInterest}>Aplicar tetos e recalcular</Button>
      </div>
    </div>
  )
}
