import { useRef, useState } from 'react'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail, CooperationTermItem, CooperationTermModel } from '@/types/cooperationTerm'
import { formatMoney, formatQty, parseQty } from './format'
import { useModal } from '@/contexts/ModalContext'

interface TermDataStepProps {
  term: CooperationTermDetail
  onChange: (term: CooperationTermDetail) => void
}

interface ItemDraft {
  id?: number
  description: string
  unit: string
  quantity: string
  unitPrice: string
  hospitals: Record<number, string>
}

const emptyItem = (units: { id: number }[]): ItemDraft => ({
  description: '',
  unit: 'KG',
  quantity: '',
  unitPrice: '',
  hospitals: Object.fromEntries(units.map((unit) => [unit.id, ''])),
})

export function TermDataStep({ term, onChange }: TermDataStepProps) {
  const { confirm } = useModal()
  const fileRef = useRef<HTMLInputElement>(null)
  const [header, setHeader] = useState({
    name: term.name,
    processNumber: term.processNumber,
    buyerInstitution: term.buyerInstitution,
    buyerEmail: term.buyerEmail ?? '',
    model: term.model,
  })
  const [units, setUnits] = useState<{ id?: number; name: string }[]>(
    term.hospitalUnits.map((unit) => ({ id: unit.id, name: unit.name })),
  )
  const [savingHeader, setSavingHeader] = useState(false)
  const [savingUnits, setSavingUnits] = useState(false)
  const [replaceImport, setReplaceImport] = useState(false)
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null)
  const [savingItem, setSavingItem] = useState(false)

  const saveHeader = async () => {
    setSavingHeader(true)
    try {
      const updated = await cooperationTermService.update(term.id, {
        name: header.name.trim(),
        processNumber: header.processNumber.trim(),
        buyerInstitution: header.buyerInstitution.trim(),
        buyerEmail: header.buyerEmail.trim() || null,
        model: header.model,
      })
      onChange(updated)
      toast.success('Dados do edital salvos.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar o edital.')
    } finally {
      setSavingHeader(false)
    }
  }

  const saveUnits = async () => {
    setSavingUnits(true)
    try {
      const updated = await cooperationTermService.saveHospitalUnits(
        term.id,
        units.map((unit) => ({ id: unit.id, name: unit.name.trim() })).filter((unit) => unit.name),
      )
      setUnits(updated.hospitalUnits.map((unit) => ({ id: unit.id, name: unit.name })))
      onChange(updated)
      toast.success('Unidades hospitalares salvas.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar as unidades.')
    } finally {
      setSavingUnits(false)
    }
  }

  const openItem = (item?: CooperationTermItem) => {
    if (!item) {
      setItemDraft(emptyItem(term.hospitalUnits))
      return
    }
    const hospitals: Record<number, string> = {}
    term.hospitalUnits.forEach((unit) => {
      const found = item.hospitalQuantities.find((qty) => qty.hospitalUnitId === unit.id)
      hospitals[unit.id] = found ? String(found.quantity).replace('.', ',') : ''
    })
    setItemDraft({
      id: item.id,
      description: item.description,
      unit: item.unit,
      quantity: String(item.estimatedQuantity).replace('.', ','),
      unitPrice: item.unitPrice === null ? '' : String(item.unitPrice).replace('.', ','),
      hospitals,
    })
  }

  const saveItem = async () => {
    if (!itemDraft) return
    const description = itemDraft.description.trim()
    const unit = itemDraft.unit.trim()
    if (!description || !unit) {
      toast.error('Informe a descrição e a unidade.')
      return
    }
    const hospitalQuantities = term.model === 'GHC'
      ? term.hospitalUnits.map((hospital) => ({
          hospitalUnitId: hospital.id,
          quantity: parseQty(itemDraft.hospitals[hospital.id] ?? '') ?? 0,
        }))
      : undefined
    const estimated = parseQty(itemDraft.quantity)
    if (term.model === 'STANDARD' && estimated === null) {
      toast.error('Informe a quantidade estimada.')
      return
    }
    if (term.model === 'GHC' && !term.hospitalUnits.length && estimated === null) {
      toast.error('Cadastre as unidades hospitalares ou informe a quantidade.')
      return
    }
    const unitPrice = itemDraft.unitPrice.trim() ? parseQty(itemDraft.unitPrice) : null
    if (itemDraft.unitPrice.trim() && unitPrice === null) {
      toast.error('Valor unitário inválido.')
      return
    }
    setSavingItem(true)
    try {
      const payload = {
        description,
        unit,
        estimatedQuantity: estimated ?? undefined,
        unitPrice,
        hospitalQuantities,
      }
      const updated = itemDraft.id
        ? await cooperationTermService.updateItem(term.id, itemDraft.id, payload)
        : await cooperationTermService.createItem(term.id, payload)
      onChange(updated)
      setItemDraft(null)
      toast.success('Item salvo.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível salvar o item.')
    } finally {
      setSavingItem(false)
    }
  }

  const removeItem = async (item: CooperationTermItem) => {
    const ok = await confirm({
      title: 'Excluir item',
      message: `Excluir "${item.description}" deste termo?`,
      confirmLabel: 'Excluir',
      variant: 'danger',
    })
    if (!ok) return
    try {
      onChange(await cooperationTermService.deleteItem(term.id, item.id))
      toast.success('Item excluído.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível excluir o item.')
    }
  }

  const importFile = async (file: File) => {
    try {
      const updated = await cooperationTermService.importItems(term.id, file, replaceImport)
      onChange(updated)
      toast.success('Planilha importada.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível importar a planilha.')
    }
  }

  const hospitalSum = itemDraft
    ? term.hospitalUnits.reduce((sum, unit) => sum + (parseQty(itemDraft.hospitals[unit.id] ?? '') ?? 0), 0)
    : 0

  return (
    <div className="space-y-6">
      <section className="panel-card">
        <div className="panel-card__body space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome do edital" value={header.name} onChange={(event) => setHeader({ ...header, name: event.target.value })} />
            <Input label="Número do processo" value={header.processNumber} onChange={(event) => setHeader({ ...header, processNumber: event.target.value })} />
            <Input label="Instituição compradora" value={header.buyerInstitution} onChange={(event) => setHeader({ ...header, buyerInstitution: event.target.value })} />
            <Input label="E-mail da instituição" type="email" value={header.buyerEmail} onChange={(event) => setHeader({ ...header, buyerEmail: event.target.value })} />
            <Select
              label="Modelo"
              value={header.model}
              onChange={(event) => setHeader({ ...header, model: event.target.value as CooperationTermModel })}
              options={[
                { value: 'GHC', label: 'GHC — quantidade por unidade hospitalar' },
                { value: 'STANDARD', label: 'Padrão — quantidade, valor unitário e valor total' },
              ]}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveHeader} disabled={savingHeader}>Salvar dados</Button>
          </div>
        </div>
      </section>

      {term.model === 'GHC' && (
        <section className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="font-semibold text-ink">Unidades hospitalares</p>
              <p className="text-sm text-grey-dark">No modelo GHC a quantidade do item é a soma destas unidades.</p>
            </div>
            <Button variant="outline" onClick={() => setUnits([...units, { name: '' }])}>
              <Plus size={16} /> Unidade
            </Button>
          </div>
          <div className="panel-card__body space-y-3">
            {units.length === 0 && <p className="text-sm text-grey-dark">Nenhuma unidade cadastrada.</p>}
            {units.map((unit, index) => (
              <div key={`${unit.id ?? 'new'}-${index}`} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                <Input
                  aria-label={`Unidade hospitalar ${index + 1}`}
                  value={unit.name}
                  placeholder="Nome da unidade"
                  onChange={(event) => {
                    const next = [...units]
                    next[index] = { ...unit, name: event.target.value }
                    setUnits(next)
                  }}
                />
                </div>
                <Button variant="ghost" aria-label="Remover unidade" onClick={() => setUnits(units.filter((current) => current !== unit))}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={saveUnits} disabled={savingUnits}>Salvar unidades</Button>
            </div>
          </div>
        </section>
      )}

      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="font-semibold text-ink">Itens</p>
            <p className="text-sm text-grey-dark">
              Cadastre manualmente ou importe CSV/Excel com as colunas descrição, unidade, quantidade e, no modelo padrão, valor unitário.
              No GHC, colunas extras viram unidades hospitalares.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Importar planilha
            </Button>
            <Button onClick={() => openItem()}>
              <Plus size={16} /> Item
            </Button>
          </div>
        </div>
        <div className="panel-card__body space-y-3">
          <label className="flex items-center gap-2 text-sm text-grey-dark">
            <input type="checkbox" checked={replaceImport} onChange={(event) => setReplaceImport(event.target.checked)} />
            Substituir os itens atuais na importação
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importFile(file)
            }}
          />
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Descrição</th>
                  <th>Un</th>
                  <th>Quantidade</th>
                  {term.model === 'STANDARD' && <th>Valor unitário</th>}
                  {term.model === 'STANDARD' && <th>Valor total</th>}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {term.items.length === 0 && (
                  <tr>
                    <td colSpan={term.model === 'STANDARD' ? 7 : 5} className="text-grey-dark">Nenhum item ainda.</td>
                  </tr>
                )}
                {term.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <p>{item.description}</p>
                      {term.model === 'GHC' && item.hospitalQuantities.length > 0 && (
                        <p className="mt-1 text-xs text-grey-dark">
                          {item.hospitalQuantities.map((qty) => {
                            const name = term.hospitalUnits.find((unit) => unit.id === qty.hospitalUnitId)?.name ?? 'Unidade'
                            return `${name}: ${formatQty(qty.quantity)}`
                          }).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td>{item.unit}</td>
                    <td>{formatQty(item.estimatedQuantity)}</td>
                    {term.model === 'STANDARD' && <td>{formatMoney(item.unitPrice)}</td>}
                    {term.model === 'STANDARD' && <td>{formatMoney(item.totalPrice)}</td>}
                    <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" aria-label={`Editar ${item.description}`} onClick={() => openItem(item)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" aria-label={`Excluir ${item.description}`} onClick={() => removeItem(item)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Modal open={itemDraft !== null} onClose={() => setItemDraft(null)} title={itemDraft?.id ? 'Editar item' : 'Novo item'} size="lg">
        {itemDraft && (
          <div className="space-y-4">
            <Input label="Descrição" value={itemDraft.description} onChange={(event) => setItemDraft({ ...itemDraft, description: event.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Unidade" value={itemDraft.unit} onChange={(event) => setItemDraft({ ...itemDraft, unit: event.target.value })} />
              {term.model === 'STANDARD' && (
                <Input label="Quantidade estimada" inputMode="decimal" value={itemDraft.quantity} onChange={(event) => setItemDraft({ ...itemDraft, quantity: event.target.value })} />
              )}
              {term.model === 'STANDARD' && (
                <Input label="Valor unitário" inputMode="decimal" value={itemDraft.unitPrice} onChange={(event) => setItemDraft({ ...itemDraft, unitPrice: event.target.value })} />
              )}
            </div>
            {term.model === 'GHC' && term.hospitalUnits.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {term.hospitalUnits.map((unit) => (
                  <Input
                    key={unit.id}
                    label={unit.name}
                    inputMode="decimal"
                    value={itemDraft.hospitals[unit.id] ?? ''}
                    onChange={(event) => setItemDraft({
                      ...itemDraft,
                      hospitals: { ...itemDraft.hospitals, [unit.id]: event.target.value },
                    })}
                  />
                ))}
                <p className="text-sm text-grey-dark sm:col-span-2">Quantidade estimada total: {formatQty(hospitalSum)}</p>
              </div>
            )}
            {term.model === 'GHC' && term.hospitalUnits.length === 0 && (
              <Input label="Quantidade estimada" inputMode="decimal" value={itemDraft.quantity} onChange={(event) => setItemDraft({ ...itemDraft, quantity: event.target.value })} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setItemDraft(null)}>Cancelar</Button>
              <Button onClick={saveItem} disabled={savingItem}>Salvar item</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
