import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import {
  businessDeskService,
  collectivePurchaseService,
} from '@/services/business.service'
import { cooperativeService } from '@/services/cooperative.service'
import { locationService } from '@/services/misc.service'
import { environment } from '@/config/environment'
import { formatKg, parseCollectiveProducts } from '@/lib/kg'
import type {
  BusinessDeskItem,
  CollectivePurchase,
  CollectivePurchaseProduct,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

type CityOption = {
  id: number
  name: string
  state?: { abbreviation?: string }
}

type ProductRow = { productName: string; weight: string }
type DeskProductRow = { productId: string; weight: string }

function ProductRowsEditor({
  rows,
  onChange,
  onAdd,
  onRemove,
  mode,
  productOptions,
}: {
  rows: ProductRow[] | DeskProductRow[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  mode: 'collective' | 'desk'
  productOptions?: { id: number; name: string }[]
}) {
  return (
    <div className="opportunity-form-products">
      <div className="opportunity-form-products__table">
        <span className="opportunity-form-products__label">Produto</span>
        <span className="opportunity-form-products__label">Peso (kg)</span>
        <span className="opportunity-form-products__label opportunity-form-products__label--action" />

        {rows.map((row, index) => (
          <div key={index} className="opportunity-form-products__row">
            {mode === 'collective' ? (
              <Input
                className="opportunity-form-products__control"
                value={(row as ProductRow).productName}
                onChange={(e) => onChange(index, 'productName', e.target.value)}
              />
            ) : (
              <Select
                className="opportunity-form-products__control"
                value={(row as DeskProductRow).productId}
                onChange={(e) => onChange(index, 'productId', e.target.value)}
                placeholder="Selecione..."
                options={(productOptions ?? []).map((p) => ({ value: p.id, label: p.name }))}
              />
            )}
            <Input
              className="opportunity-form-products__control"
              type="number"
              min={1}
              value={row.weight}
              onChange={(e) => onChange(index, 'weight', e.target.value)}
            />
            <div className="opportunity-form-products__remove-wrap">
              {index > 0 ? (
                <button
                  type="button"
                  className="opportunity-form-products__remove"
                  aria-label="Remover produto"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" className="opportunity-form-products__add" onClick={onAdd}>
        <Plus size={16} />
        Adicionar mais um produto
      </Button>
    </div>
  )
}

export function CollectivePurchaseModal({
  open,
  itemId,
  onClose,
  onSaved,
}: {
  open: boolean
  itemId?: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([{ productName: '', weight: '' }])
  const [citySearch, setCitySearch] = useState('')
  const [cityOptions, setCityOptions] = useState<CityOption[]>([])
  const [cityId, setCityId] = useState<number | null>(null)
  const [cityLabel, setCityLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (!itemId) {
      setDescription('')
      setProducts([{ productName: '', weight: '' }])
      setCitySearch('')
      setCityId(null)
      setCityLabel('')
      return
    }
    setLoading(true)
    collectivePurchaseService
      .view(itemId)
      .then((data) => {
        setDescription(data.description ?? '')
        const parsed = parseCollectiveProducts(data.products)
        setProducts(
          parsed.length
            ? parsed.map((p) => ({ productName: p.productName ?? '', weight: String(p.weight ?? '') }))
            : [{ productName: '', weight: '' }],
        )
        if (data.city) {
          setCityId(data.cityId ?? data.city.id ?? null)
          setCityLabel(
            `${data.city.name}${data.city.state?.abbreviation ? ` - ${data.city.state.abbreviation}` : ''}`,
          )
          setCitySearch(
            `${data.city.name}${data.city.state?.abbreviation ? ` - ${data.city.state.abbreviation}` : ''}`,
          )
        }
      })
      .catch(() => toast.error('Erro ao carregar oportunidade'))
      .finally(() => setLoading(false))
  }, [open, itemId])

  useEffect(() => {
    if (citySearch.length < 2 || citySearch === cityLabel) return
    locationService.searchCity(citySearch).then(setCityOptions)
  }, [citySearch, cityLabel])

  const save = async () => {
    if (!cityId) {
      toast.error('Selecione um município')
      return
    }
    const payload = {
      cityId,
      description,
      products: products
        .filter((p) => p.productName && p.weight)
        .map(
          (p): CollectivePurchaseProduct => ({
            productName: p.productName,
            weight: Number(p.weight),
          }),
        ),
    }
    if (!payload.products.length) {
      toast.error('Informe ao menos um produto')
      return
    }
    setSaving(true)
    try {
      if (itemId) await collectivePurchaseService.update(itemId, payload)
      else await collectivePurchaseService.create(payload)
      toast.success(itemId ? 'Oportunidade atualizada!' : 'Oportunidade cadastrada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={itemId ? `Editar Oportunidade - #${itemId}` : 'Cadastrar Oportunidade'}
      size="lg"
    >
      {loading ? (
        <LoadingOverlay visible inline message="Carregando..." />
      ) : (
        <div className="space-y-4">
          <div>
            <Input
              label="Município"
              value={citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value)
                setCityId(null)
                setCityLabel('')
              }}
              placeholder="Digite para buscar..."
            />
            {cityOptions.length > 0 && !cityId && (
              <ul className="opportunity-city-suggestions">
                {cityOptions.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const label = `${city.name}${city.state?.abbreviation ? ` - ${city.state.abbreviation}` : ''}`
                        setCityId(city.id)
                        setCityLabel(label)
                        setCitySearch(label)
                        setCityOptions([])
                      }}
                    >
                      {city.name}
                      {city.state?.abbreviation ? ` - ${city.state.abbreviation}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ProductRowsEditor
            mode="collective"
            rows={products}
            onChange={(index, field, value) =>
              setProducts((prev) =>
                prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
              )
            }
            onAdd={() => setProducts((prev) => [...prev, { productName: '', weight: '' }])}
            onRemove={(index) => setProducts((prev) => prev.filter((_, i) => i !== index))}
          />
          <Textarea label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {itemId ? 'Editar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function StartCollectivePurchaseModal({
  open,
  purchaseId,
  onClose,
  onStarted,
}: {
  open: boolean
  purchaseId: number | null
  onClose: () => void
  onStarted: () => void
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [opportunity, setOpportunity] = useState<CollectivePurchase | null>(null)

  useEffect(() => {
    if (!open || !purchaseId) {
      setOpportunity(null)
      setMessage('')
      return
    }
    setLoading(true)
    collectivePurchaseService
      .view(purchaseId)
      .then(setOpportunity)
      .catch(() => toast.error('Erro ao carregar oportunidade'))
      .finally(() => setLoading(false))
  }, [open, purchaseId])

  const products = parseCollectiveProducts(opportunity?.products)

  const send = async () => {
    if (!purchaseId || !message.trim()) return
    setSaving(true)
    try {
      await collectivePurchaseService.startTrading(purchaseId, { initialMessage: message.trim() })
      toast.success('Sua mensagem foi enviada. Entraremos em contato o mais breve possível.')
      onStarted()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar mensagem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Iniciar Conversa - Compra Coletiva #${purchaseId ?? '—'}`}
      size="lg"
    >
      {loading ? (
        <LoadingOverlay visible inline message="Carregando..." />
      ) : (
        <div className="start-opportunity-modal">
          <div className="start-opportunity-modal__header">
            <img src="/assets/imgs/avatar-redecoop.png" alt="Rede Coop" className="start-opportunity-modal__avatar" />
            <strong>Rede Coop</strong>
          </div>
          <div className="start-opportunity-modal__details">
            {products.map((product, index) => (
              <p key={index}>
                <span className="business-view-products__dot" />
                {formatKg(product.weight)} - {product.productName}
              </p>
            ))}
            {opportunity?.description && <p className="business-view-desc">{opportunity.description}</p>}
          </div>
          {!opportunity?.active && (
            <p className="start-opportunity-modal__unavailable">Oportunidade não está mais disponível</p>
          )}
          {opportunity?.active && (
            <div className="start-opportunity-modal__input">
              <Textarea
                placeholder="Inserir Texto"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button onClick={send} disabled={saving || !message.trim()}>
                  Enviar Mensagem
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export function BusinessDeskModal({
  open,
  itemId,
  onClose,
  onSaved,
}: {
  open: boolean
  itemId?: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [products, setProducts] = useState<DeskProductRow[]>([{ productId: '', weight: '' }])
  const [productOptions, setProductOptions] = useState<{ id: number; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !user?.cooperative?.id) return
    cooperativeService.selectProducts(user.cooperative.id).then(setProductOptions)
  }, [open, user])

  useEffect(() => {
    if (!open) return
    if (!itemId) {
      setDescription('')
      setProducts([{ productId: '', weight: '' }])
      return
    }
    setLoading(true)
    businessDeskService
      .view(itemId)
      .then((data) => {
        setDescription(data.description ?? '')
        const rows =
          data.businessDeskProducts?.map((item) => ({
            productId: String(item.product?.id ?? ''),
            weight: String(item.weight ?? ''),
          })) ?? []
        setProducts(rows.length ? rows : [{ productId: '', weight: '' }])
      })
      .catch(() => toast.error('Erro ao carregar oportunidade'))
      .finally(() => setLoading(false))
  }, [open, itemId])

  const catalogProducts = products
    .filter((p) => p.productId && p.weight)
    .map((p) => ({ productId: Number(p.productId), weight: Number(p.weight) }))
  const canSave = description.trim().length > 0 && catalogProducts.length > 0

  const save = async () => {
    if (!description.trim()) {
      toast.error('Informe a descrição')
      return
    }
    if (!catalogProducts.length) {
      toast.error('Informe ao menos um produto')
      return
    }
    setSaving(true)
    try {
      const data = { description: description.trim(), catalogProducts }
      if (itemId) await businessDeskService.update(itemId, data)
      else await businessDeskService.create(data)
      toast.success(itemId ? 'Oportunidade atualizada!' : 'Oportunidade cadastrada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={itemId ? `Editar Oportunidade - #${itemId}` : 'Cadastrar Oportunidade'}
      size="lg"
    >
      {loading ? (
        <LoadingOverlay visible inline message="Carregando..." />
      ) : (
        <div className="space-y-4">
          <ProductRowsEditor
            mode="desk"
            rows={products}
            productOptions={productOptions}
            onChange={(index, field, value) =>
              setProducts((prev) =>
                prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
              )
            }
            onAdd={() => setProducts((prev) => [...prev, { productId: '', weight: '' }])}
            onRemove={(index) => setProducts((prev) => prev.filter((_, i) => i !== index))}
          />
          <Textarea
            label="Descrição *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || !canSave}>
              {itemId ? 'Editar' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function StartBusinessDeskModal({
  open,
  deskId,
  onClose,
  onStarted,
}: {
  open: boolean
  deskId: number | null
  onClose: () => void
  onStarted: () => void
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [desk, setDesk] = useState<BusinessDeskItem | null>(null)

  useEffect(() => {
    if (!open || !deskId) {
      setDesk(null)
      setMessage('')
      return
    }
    setLoading(true)
    businessDeskService
      .view(deskId)
      .then(setDesk)
      .catch(() => toast.error('Erro ao carregar oportunidade'))
      .finally(() => setLoading(false))
  }, [open, deskId])

  const send = async () => {
    if (!deskId || !message.trim()) return
    setSaving(true)
    try {
      await businessDeskService.startContact({
        businessDeskId: deskId,
        initialMessage: message.trim(),
      })
      toast.success('Sua mensagem foi enviada!')
      onStarted()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar mensagem')
    } finally {
      setSaving(false)
    }
  }

  const coopImg = desk?.cooperative?.img
    ? `${environment.storageUrl}${desk.cooperative.img}`
    : '/assets/imgs/default-cooperative.png'

  return (
    <Modal open={open} onClose={onClose} title={`Iniciar Conversa - Balcão #${deskId ?? '—'}`} size="lg">
      {loading ? (
        <LoadingOverlay visible inline message="Carregando..." />
      ) : (
        <div className="start-opportunity-modal">
          <div className="start-opportunity-modal__header">
            <img src={coopImg} alt="" className="start-opportunity-modal__avatar" />
            <strong>{desk?.cooperative?.companyName ?? 'Cooperativa'}</strong>
          </div>
          <div className="start-opportunity-modal__details">
            {desk?.businessDeskProducts?.map((item, index) => (
              <p key={index}>
                <span className="business-view-products__dot" />
                {formatKg(item.weight)} - {item.product?.name}
              </p>
            ))}
            {desk?.description && <p className="business-view-desc">{desk.description}</p>}
          </div>
          {!desk?.active && (
            <p className="start-opportunity-modal__unavailable">Oportunidade não está mais disponível</p>
          )}
          {desk?.active && (
            <div className="start-opportunity-modal__input">
              <Textarea
                placeholder="Inserir Texto"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button onClick={send} disabled={saving || !message.trim()}>
                  Enviar Mensagem
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
