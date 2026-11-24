import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatQty } from './format'

interface CoopOption {
  id: number
  label: string
}

interface TermInterestStepProps {
  term: CooperationTermDetail
  cooperatives: CoopOption[]
  onChange: (term: CooperationTermDetail) => void
}

export function TermInterestStep({ term, cooperatives, onChange }: TermInterestStepProps) {
  const [selected, setSelected] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(term.items.map((item) => [item.id, item.interests.map((interest) => interest.cooperativeId)])),
  )
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    if (!needle) return cooperatives
    return cooperatives.filter((coop) => coop.label.toLocaleLowerCase('pt-BR').includes(needle))
  }, [cooperatives, query])

  const toggle = (itemId: number, cooperativeId: number) => {
    setSelected((current) => {
      const list = current[itemId] ?? []
      const next = list.includes(cooperativeId)
        ? list.filter((id) => id !== cooperativeId)
        : [...list, cooperativeId]
      return { ...current, [itemId]: next }
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const updated = await cooperationTermService.setInterests(
        term.id,
        term.items.map((item) => ({ itemId: item.id, cooperativeIds: selected[item.id] ?? [] })),
      )
      onChange(updated)
      toast.success('Interesse salvo e divisão recalculada.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar o interesse.')
    } finally {
      setSaving(false)
    }
  }

  if (!term.items.length) {
    return (
      <div className="term-notice term-notice--warn">
        <span className="term-notice__icon">
          <Info size={18} />
        </span>
        <div>
          <p className="term-notice__title">Nenhum item cadastrado</p>
          <p className="term-notice__text">Cadastre os itens antes de marcar o interesse.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="panel-card">
        <div className="panel-card__body space-y-4">
          <p className="text-sm text-grey-dark">
            Marque, item a item, quais cooperativas já cadastradas vão cotar. A divisão igualitária é recalculada ao salvar.
          </p>
          <Input label="Buscar cooperativa" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome da cooperativa" />
          {term.items.map((item) => (
            <fieldset key={item.id} className="term-interest">
              <legend>
                {item.itemNumber}. {item.description}
                <span>{formatQty(item.estimatedQuantity)} {item.unit}</span>
              </legend>
              <div className="term-interest__grid">
                {visible.map((coop) => {
                  const checked = (selected[item.id] ?? []).includes(coop.id)
                  return (
                    <label key={coop.id} className="term-choice">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.id, coop.id)}
                      />
                      <span>{coop.label}</span>
                    </label>
                  )
                })}
              </div>
              {visible.length === 0 && <p className="mt-2 text-sm text-grey-dark">Nenhuma cooperativa encontrada.</p>}
            </fieldset>
          ))}
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>Salvar interesse</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
