import { useCallback, useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { configService } from '@/services/misc.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type {
  ConfigMpyItem,
  ConfigNamedItem,
  ConfigRange,
  ConfigValueRange,
  PanelConfig,
} from '@/types'

function formatPricePerKg(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}/kg`
}

function parsePriceInput(raw: string) {
  const cleaned = raw.replace(/[^\d,]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? 0 : n
}

function matrixFromApi(
  valueRanges: ConfigValueRange[] | undefined,
  distanceIds: number[],
  weightIds: number[],
) {
  return distanceIds.map((dId) =>
    weightIds.map((wId) => {
      const cell = valueRanges?.find((vr) => vr.distanceRangeId === dId && vr.weightRangeId === wId)
      return cell?.value ?? 0
    }),
  )
}

function defaultRanges() {
  return {
    distanceRanges: [
      { from: 0, to: 50 },
      { from: 50.01, to: 100 },
    ] as ConfigRange[],
    weightRanges: [
      { from: 0, to: 100 },
      { from: 100.01, to: 500 },
    ] as ConfigRange[],
    valueMatrix: [
      [0, 0],
      [0, 0],
    ] as number[][],
  }
}

export function PanelConfigForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serviceTax, setServiceTax] = useState('0')
  const [minimumServiceTax, setMinimumServiceTax] = useState('0')
  const [loadTypes, setLoadTypes] = useState<ConfigMpyItem[]>([{ name: '', mpy: 1 }])
  const [vehicleTypes, setVehicleTypes] = useState<ConfigMpyItem[]>([{ name: '', mpy: 1 }])
  const [productCategories, setProductCategories] = useState<ConfigNamedItem[]>([{ name: '' }])
  const [packaging, setPackaging] = useState<ConfigNamedItem[]>([{ name: '' }])
  const [distanceRanges, setDistanceRanges] = useState<ConfigRange[]>(defaultRanges().distanceRanges)
  const [weightRanges, setWeightRanges] = useState<ConfigRange[]>(defaultRanges().weightRanges)
  const [valueMatrix, setValueMatrix] = useState<number[][]>(defaultRanges().valueMatrix)
  const [priceInputs, setPriceInputs] = useState<string[][]>([])

  const syncPriceInputs = useCallback((matrix: number[][]) => {
    setPriceInputs(matrix.map((row) => row.map((v) => formatPricePerKg(v))))
  }, [])

  const applyConfig = useCallback(
    (data: PanelConfig) => {
      setServiceTax(String(data.serviceTax ?? 0))
      setMinimumServiceTax(String(data.minimumServiceTax ?? 0))
      setLoadTypes(data.loadTypes?.length ? data.loadTypes : [{ name: '', mpy: 1 }])
      setVehicleTypes(data.vehicleTypes?.length ? data.vehicleTypes : [{ name: '', mpy: 1 }])
      setProductCategories(data.productCategories?.length ? data.productCategories : [{ name: '' }])
      setPackaging(data.packaging?.length ? data.packaging : [{ name: '' }])

      const distances = data.distanceRanges?.length ? data.distanceRanges : defaultRanges().distanceRanges
      const weights = data.weightRanges?.length ? data.weightRanges : defaultRanges().weightRanges
      setDistanceRanges(distances)
      setWeightRanges(weights)

      const distanceIds = distances.map((d) => d.id).filter((id): id is number => id != null)
      const weightIds = weights.map((w) => w.id).filter((id): id is number => id != null)

      let matrix: number[][]
      if (data.valueRanges?.length && distanceIds.length === distances.length && weightIds.length === weights.length) {
        matrix = matrixFromApi(data.valueRanges, distanceIds, weightIds)
      } else {
        matrix = Array.from({ length: distances.length }, () =>
          Array.from({ length: weights.length }, () => 0),
        )
      }

      setValueMatrix(matrix)
      syncPriceInputs(matrix)
    },
    [syncPriceInputs],
  )

  useEffect(() => {
    configService
      .view()
      .then(applyConfig)
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [applyConfig])

  const updateRangeTo = (
    ranges: ConfigRange[],
    index: number,
    to: number,
    setter: (next: ConfigRange[]) => void,
  ) => {
    const next = ranges.map((r, i) => (i === index ? { ...r, to } : { ...r }))
    if (index < next.length - 1 && to > 0) {
      next[index + 1] = { ...next[index + 1], from: parseFloat((to + 0.01).toFixed(2)) }
    }
    setter(next)
  }

  const addWeightRange = () => {
    const last = weightRanges[weightRanges.length - 1]
    const from = last ? parseFloat((last.to + 0.01).toFixed(2)) : 0
    setWeightRanges([...weightRanges, { from, to: 0 }])
    const nextMatrix = valueMatrix.map((row) => [...row, 0])
    setValueMatrix(nextMatrix)
    syncPriceInputs(nextMatrix)
  }

  const removeWeightRange = (index: number) => {
    if (index < 2) return
    setWeightRanges(weightRanges.filter((_, i) => i !== index))
    const nextMatrix = valueMatrix.map((row) => row.filter((_, j) => j !== index))
    setValueMatrix(nextMatrix)
    syncPriceInputs(nextMatrix)
  }

  const addDistanceRange = () => {
    const last = distanceRanges[distanceRanges.length - 1]
    const from = last ? parseFloat((last.to + 0.01).toFixed(2)) : 0
    setDistanceRanges([...distanceRanges, { from, to: 0 }])
    const nextMatrix = [...valueMatrix, Array.from({ length: weightRanges.length }, () => 0)]
    setValueMatrix(nextMatrix)
    syncPriceInputs(nextMatrix)
  }

  const removeDistanceRange = (index: number) => {
    if (index < 2) return
    setDistanceRanges(distanceRanges.filter((_, i) => i !== index))
    const nextMatrix = valueMatrix.filter((_, i) => i !== index)
    setValueMatrix(nextMatrix)
    syncPriceInputs(nextMatrix)
  }

  const setCellValue = (i: number, j: number, value: number) => {
    setValueMatrix((prev) =>
      prev.map((row, ri) => row.map((cell, ci) => (ri === i && ci === j ? value : cell))),
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const tax = Number(serviceTax)
      const minTax = Number(minimumServiceTax)
      if (Number.isNaN(tax) || Number.isNaN(minTax)) {
        toast.error('Preencha as taxas corretamente')
        return
      }

      await configService.update({
        serviceTax: tax,
        minimumServiceTax: minTax,
        loadTypes: loadTypes.filter((t) => t.name.trim()),
        vehicleTypes: vehicleTypes.filter((t) => t.name.trim()),
        productCategories: productCategories.filter((t) => t.name.trim()),
        packaging: packaging.filter((t) => t.name.trim()),
        distanceRanges,
        weightRanges,
        valueRanges: valueMatrix,
      } as PanelConfig & { valueRanges: number[][] })

      toast.success('Configurações salvas!')
      const refreshed = await configService.view()
      applyConfig(refreshed)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
  }

  return (
    <div className="settings-panel">
      <section className="settings-panel__section">
        <h3>Tabela de variáveis de preço × distância × peso</h3>
        <div className="settings-price-table-wrap dashboard-scroll">
          <table className="settings-price-table">
            <thead>
              <tr>
                <th rowSpan={2} className="settings-price-table__corner">
                  <span>Faixas de distância (km)</span>
                </th>
                <th colSpan={weightRanges.length}>Faixas de peso (kg)</th>
              </tr>
              <tr>
                {weightRanges.map((wr, j) => (
                  <th key={j} className="settings-price-table__weight-head">
                    <div className="settings-price-table__range-pair">
                      <span>De</span>
                      <span>Até</span>
                    </div>
                    <div className="settings-price-table__range-inputs">
                      <input type="number" value={wr.from} readOnly className="settings-price-table__input--readonly" />
                      <input
                        type="number"
                        value={wr.to || ''}
                        onChange={(e) =>
                          updateRangeTo(weightRanges, j, Number(e.target.value), setWeightRanges)
                        }
                      />
                    </div>
                    {j > 1 && (
                      <button type="button" className="settings-price-table__remove" onClick={() => removeWeightRange(j)}>
                        ×
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {distanceRanges.map((dr, i) => (
                <tr key={i}>
                  <td className="settings-price-table__distance-cell">
                    {i > 1 && (
                      <button
                        type="button"
                        className="settings-price-table__remove settings-price-table__remove--left"
                        onClick={() => removeDistanceRange(i)}
                      >
                        ×
                      </button>
                    )}
                    <div className="settings-price-table__range-inputs">
                      <input type="number" value={dr.from} readOnly className="settings-price-table__input--readonly" />
                      <input
                        type="number"
                        value={dr.to || ''}
                        onChange={(e) =>
                          updateRangeTo(distanceRanges, i, Number(e.target.value), setDistanceRanges)
                        }
                      />
                    </div>
                  </td>
                  {weightRanges.map((_, j) => (
                    <td key={j}>
                      <input
                        type="text"
                        className="settings-price-table__price"
                        value={priceInputs[i]?.[j] ?? formatPricePerKg(valueMatrix[i]?.[j] ?? 0)}
                        onChange={(e) => {
                          setCellValue(i, j, parsePriceInput(e.target.value))
                          setPriceInputs((prev) => {
                            const next = prev.map((row) => [...row])
                            if (!next[i]) next[i] = []
                            next[i][j] = e.target.value
                            return next
                          })
                        }}
                        onBlur={() => {
                          setPriceInputs((prev) => {
                            const next = prev.map((row) => [...row])
                            if (!next[i]) next[i] = []
                            next[i][j] = formatPricePerKg(valueMatrix[i]?.[j] ?? 0)
                            return next
                          })
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="settings-panel__add-menu">
          <Button variant="secondary" onClick={addWeightRange}>
            <Plus size={14} /> Faixa de peso
          </Button>
          <Button variant="secondary" onClick={addDistanceRange}>
            <Plus size={14} /> Faixa de distância
          </Button>
        </div>
      </section>

      <div className="settings-panel__grid">
        <section className="settings-panel__section">
          <h3>Variáveis de preço</h3>
          <div className="settings-panel__fields">
            <Input
              label="Taxa de serviço (%)"
              value={`${serviceTax}%`}
              onChange={(e) => setServiceTax(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <Input
              label="Frete mínimo (R$)"
              type="number"
              value={minimumServiceTax}
              onChange={(e) => setMinimumServiceTax(e.target.value)}
            />
          </div>
          <h4>Tipos de carga</h4>
          <NamedMpyList items={loadTypes} onChange={setLoadTypes} onAdd={() => setLoadTypes([...loadTypes, { name: '', mpy: 1 }])} />
        </section>

        <section className="settings-panel__section">
          <h3>Tipos de caminhão</h3>
          <NamedMpyList items={vehicleTypes} onChange={setVehicleTypes} onAdd={() => setVehicleTypes([...vehicleTypes, { name: '', mpy: 1 }])} />
          <h4>Embalagens</h4>
          <NamedList items={packaging} onChange={setPackaging} onAdd={() => setPackaging([...packaging, { name: '' }])} />
        </section>

        <section className="settings-panel__section">
          <h3>Categorias de produto</h3>
          <NamedList
            items={productCategories}
            onChange={setProductCategories}
            onAdd={() => setProductCategories([...productCategories, { name: '' }])}
          />
        </section>
      </div>

      <div className="settings-panel__footer">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}

function NamedMpyList({
  items,
  onChange,
  onAdd,
}: {
  items: ConfigMpyItem[]
  onChange: (items: ConfigMpyItem[]) => void
  onAdd: () => void
}) {
  return (
    <div className="settings-named-list">
      <div className="settings-named-list__header">
        <span>Tipo</span>
        <span>Mpy</span>
        <span />
      </div>
      {items.map((item, index) => (
        <div key={index} className="settings-named-list__row">
          <input
            value={item.name}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...item, name: e.target.value }
              onChange(next)
            }}
            placeholder="Nome"
          />
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={item.mpy}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...item, mpy: Number(e.target.value) }
              onChange(next)
            }}
          />
          {!item.id && index > 0 ? (
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              <Trash2 size={16} />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={onAdd}>
        <Plus size={14} /> Adicionar
      </Button>
    </div>
  )
}

function NamedList({
  items,
  onChange,
  onAdd,
}: {
  items: ConfigNamedItem[]
  onChange: (items: ConfigNamedItem[]) => void
  onAdd: () => void
}) {
  return (
    <div className="settings-named-list">
      {items.map((item, index) => (
        <div key={index} className="settings-named-list__row settings-named-list__row--single">
          <input
            value={item.name}
            onChange={(e) => {
              const next = [...items]
              next[index] = { ...item, name: e.target.value }
              onChange(next)
            }}
            placeholder="Nome"
          />
          {!item.id && index > 0 ? (
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              <Trash2 size={16} />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={onAdd}>
        <Plus size={14} /> Adicionar
      </Button>
    </div>
  )
}
