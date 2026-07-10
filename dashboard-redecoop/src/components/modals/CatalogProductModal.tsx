import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { catalogService, productService } from '@/services/product.service'
import { resolveStorageUrl } from '@/lib/storage'
import type { CatalogProduct, CatalogSeasonality, Product, SeasonalityLevel } from '@/types'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const SEASONALITY_CYCLE: SeasonalityLevel[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH']
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

function defaultSeasonality(): CatalogSeasonality[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    seasonality: 'NONE' as SeasonalityLevel,
  }))
}

function emptyPackaging() {
  return { info: '', packagingId: '', weight: '' }
}

interface CatalogProductModalProps {
  open: boolean
  item?: CatalogProduct | null
  onClose: () => void
  onSaved: () => void
}

export function CatalogProductModal({ open, item, onClose, onSaved }: CatalogProductModalProps) {
  const isEdit = Boolean(item?.id)

  const [products, setProducts] = useState<Product[]>([])
  const [packaging, setPackaging] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [productId, setProductId] = useState('')
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const [useDefaultCatalogImage, setUseDefaultCatalogImage] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [hasSeasonality, setHasSeasonality] = useState(false)
  const [seasonality, setSeasonality] = useState<CatalogSeasonality[]>(defaultSeasonality)
  const [highEstimate, setHighEstimate] = useState('')
  const [mediumEstimate, setMediumEstimate] = useState('')
  const [lowEstimate, setLowEstimate] = useState('')

  const [hasPrimaryPackaging, setHasPrimaryPackaging] = useState(false)
  const [primaryPackaging, setPrimaryPackaging] = useState(emptyPackaging)
  const [hasSecondaryPackaging, setHasSecondaryPackaging] = useState(false)
  const [secondaryPackaging, setSecondaryPackaging] = useState(emptyPackaging)

  const productSelected = useMemo(
    () => products.find((p) => String(p.id) === productId),
    [products, productId],
  )

  const totalAnnualProduction = useMemo(() => {
    const low = parseFloat(lowEstimate) || 0
    const medium = parseFloat(mediumEstimate) || 0
    const high = parseFloat(highEstimate) || 0
    let lowCount = 0
    let mediumCount = 0
    let highCount = 0
    seasonality.forEach((month) => {
      if (month.seasonality === 'LOW') lowCount++
      if (month.seasonality === 'MEDIUM') mediumCount++
      if (month.seasonality === 'HIGH') highCount++
    })
    return parseFloat((lowCount * low + mediumCount * medium + highCount * high).toFixed(2))
  }, [seasonality, lowEstimate, mediumEstimate, highEstimate])

  useEffect(() => {
    if (!imageFile) {
      setPreviewObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setPreviewObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const imagePreview = useMemo(() => {
    if (previewObjectUrl) return previewObjectUrl
    if (customImage && !useDefaultCatalogImage) return resolveStorageUrl(customImage)
    if (productSelected?.img) return resolveStorageUrl(productSelected.img)
    return ''
  }, [previewObjectUrl, customImage, useDefaultCatalogImage, productSelected])

  useEffect(() => {
    if (!open) return

    setImageFile(null)
    setPreviewObjectUrl(null)
    setUseDefaultCatalogImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setLoading(Boolean(item?.id))

    Promise.all([
      productService.listForCooperative(),
      catalogService.packaging(),
      item?.id ? catalogService.view(item.id) : Promise.resolve(null),
    ])
      .then(([productList, packagingList, catalogItem]) => {
        setProducts(productList)
        setPackaging(packagingList)

        if (catalogItem) {
          setProductId(String(catalogItem.productId ?? catalogItem.product?.id ?? ''))
          setCustomImage(catalogItem.customImage ?? null)
          setHasSeasonality(Boolean(catalogItem.hasSeasonality))
          setHighEstimate(String(catalogItem.highEstimate ?? ''))
          setMediumEstimate(String(catalogItem.mediumEstimate ?? ''))
          setLowEstimate(String(catalogItem.lowEstimate ?? ''))
          setHasPrimaryPackaging(Boolean(catalogItem.hasPrimaryPackaging))
          setHasSecondaryPackaging(Boolean(catalogItem.hasSecondaryPackaging))

          const months = defaultSeasonality()
          const seasonalities = Array.isArray(catalogItem.seasonalities)
            ? catalogItem.seasonalities
            : []
          seasonalities.forEach((s) => {
            const index = months.findIndex((m) => m.month === s.month)
            if (index >= 0) months[index] = { month: s.month, seasonality: s.seasonality }
          })
          setSeasonality(months)

          const primary = catalogItem.primaryPackagingDetails
          setPrimaryPackaging({
            info: primary?.info ?? '',
            packagingId: primary?.packagingId ? String(primary.packagingId) : '',
            weight: primary?.weight != null ? String(primary.weight) : '',
          })

          const secondary = catalogItem.secondaryPackagingDetails
          setSecondaryPackaging({
            info: secondary?.info ?? '',
            packagingId: secondary?.packagingId ? String(secondary.packagingId) : '',
            weight: secondary?.weight != null ? String(secondary.weight) : '',
          })
        } else {
          setProductId('')
          setCustomImage(null)
          setHasSeasonality(false)
          setSeasonality(defaultSeasonality())
          setHighEstimate('')
          setMediumEstimate('')
          setLowEstimate('')
          setHasPrimaryPackaging(false)
          setPrimaryPackaging(emptyPackaging())
          setHasSecondaryPackaging(false)
          setSecondaryPackaging(emptyPackaging())
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar dados')
      })
      .finally(() => setLoading(false))
  }, [open, item])

  const toggleSeasonality = (index: number) => {
    setSeasonality((prev) => {
      const next = [...prev]
      const current = next[index].seasonality
      const nextIndex = (SEASONALITY_CYCLE.indexOf(current) + 1) % SEASONALITY_CYCLE.length
      next[index] = { ...next[index], seasonality: SEASONALITY_CYCLE[nextIndex] }
      return next
    })
  }

  const clearSelectedFile = () => {
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      clearSelectedFile()
      return
    }

    const mime = file.type.toLowerCase()
    const accepted =
      ACCEPTED_IMAGE_TYPES.includes(mime) ||
      /\.(png|jpe?g|webp)$/i.test(file.name)
    if (!accepted) {
      toast.error('Formato não suportado. Use PNG, JPEG ou WebP.')
      event.target.value = ''
      return
    }

    setImageFile(file)
    setUseDefaultCatalogImage(false)
  }

  const onSelectProduct = (id: string) => {
    if (id === productId) return
    setProductId(id)
    setCustomImage(null)
    clearSelectedFile()
    setUseDefaultCatalogImage(false)
  }

  const canSave = Boolean(productId) && (
    !hasSeasonality || (highEstimate && mediumEstimate && lowEstimate)
  ) && (
    !hasPrimaryPackaging || (primaryPackaging.packagingId && primaryPackaging.weight)
  ) && (
    !hasSecondaryPackaging || (secondaryPackaging.packagingId && secondaryPackaging.weight)
  )

  const save = async () => {
    if (!canSave) return

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        productId: Number(productId),
        hasSeasonality,
        hasPrimaryPackaging,
        hasSecondaryPackaging,
      }

      if (hasSeasonality) {
        payload.seasonality = seasonality
        payload.highEstimate = Number(highEstimate)
        payload.mediumEstimate = Number(mediumEstimate)
        payload.lowEstimate = Number(lowEstimate)
      }

      if (hasPrimaryPackaging) {
        payload.primaryPackagingDetails = {
          info: primaryPackaging.info,
          packagingId: Number(primaryPackaging.packagingId),
          weight: Number(primaryPackaging.weight),
        }
      }

      if (hasSecondaryPackaging) {
        payload.secondaryPackagingDetails = {
          info: secondaryPackaging.info,
          packagingId: Number(secondaryPackaging.packagingId),
          weight: Number(secondaryPackaging.weight),
        }
      }

      if (imageFile) {
        const { filename } = await catalogService.uploadCustomImage(imageFile)
        payload.customImage = filename
      } else if (isEdit && useDefaultCatalogImage) {
        payload.customImage = ''
      } else if (customImage) {
        payload.customImage = customImage
      }

      if (item?.id) {
        await catalogService.update(item.id, payload)
        toast.success('Alterado com sucesso')
      } else {
        await catalogService.create(payload)
        toast.success('Produto adicionado ao seu catálogo')
      }

      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`${isEdit ? 'Editar' : 'Adicionar'} produto ${isEdit ? 'do' : 'ao'} catálogo`}
        size="xl"
        bodyClassName="catalog-modal-body"
      >
        {loading ? (
          <div className="catalog-modal-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="coops-skeleton" />
            ))}
          </div>
        ) : (
          <div className="catalog-modal-form">
            <Select
              label="Selecione o produto"
              value={productId}
              onChange={(e) => onSelectProduct(e.target.value)}
              placeholder="Selecione..."
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />

            {productSelected && (
              <div className="catalog-product-preview">
                {imagePreview && (
                  <button type="button" className="catalog-product-preview__image" onClick={() => setPreviewSrc(imagePreview)}>
                    <img src={imagePreview} alt="" />
                  </button>
                )}
                <div className="catalog-product-preview__info">
                  <p>Tipo: {productSelected.productType?.name ?? productSelected.type?.name ?? '—'}</p>
                  <p>Categoria: {productSelected.productCategory?.name ?? productSelected.category?.name ?? '—'}</p>
                  <div className="catalog-product-preview__upload">
                    <span className="catalog-product-preview__upload-label">Foto da sua oferta (opcional)</span>
                    <label className="catalog-product-preview__file-btn">
                      {imageFile ? 'Trocar imagem' : 'Selecionar imagem'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={onFileSelected}
                      />
                    </label>
                    {imageFile && (
                      <p className="catalog-product-preview__file-name">{imageFile.name}</p>
                    )}
                    <small>
                      Se enviar, esta imagem aparece no site no lugar da foto genérica do produto (marca da cooperativa).
                    </small>
                    {isEdit && (customImage || imageFile) && (
                      <button
                        type="button"
                        className="catalog-product-preview__link"
                        onClick={() => {
                          setUseDefaultCatalogImage(true)
                          clearSelectedFile()
                        }}
                      >
                        Usar imagem padrão do cadastro RedeCoop
                      </button>
                    )}
                    {imageFile && (
                      <button
                        type="button"
                        className="catalog-product-preview__link"
                        onClick={clearSelectedFile}
                      >
                        Remover foto escolhida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <label className="catalog-checkbox">
              <input
                type="checkbox"
                checked={hasSeasonality}
                onChange={(e) => setHasSeasonality(e.target.checked)}
              />
              Possui sazonalidade
            </label>

            {hasSeasonality && (
              <div className="catalog-seasonality">
                <div className="catalog-seasonality__months">
                  {seasonality.map((month, index) => (
                    <button
                      key={month.month}
                      type="button"
                      className={`catalog-seasonality__month catalog-seasonality__month--${month.seasonality.toLowerCase()}`}
                      onClick={() => toggleSeasonality(index)}
                    >
                      {MONTHS[month.month - 1].slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="catalog-seasonality__legend">
                  <span><i className="catalog-seasonality__dot catalog-seasonality__dot--none" /> Nenhum</span>
                  <span><i className="catalog-seasonality__dot catalog-seasonality__dot--low" /> Baixo</span>
                  <span><i className="catalog-seasonality__dot catalog-seasonality__dot--medium" /> Médio</span>
                  <span><i className="catalog-seasonality__dot catalog-seasonality__dot--high" /> Alto</span>
                </div>

                <p className="catalog-seasonality__title">Estimativa mensal de produção</p>
                <div className="catalog-seasonality__estimates">
                  <Input label="Alta (kg/mês)" type="number" min={1} value={highEstimate} onChange={(e) => setHighEstimate(e.target.value)} />
                  <Input label="Média (kg/mês)" type="number" min={1} value={mediumEstimate} onChange={(e) => setMediumEstimate(e.target.value)} />
                  <Input label="Baixa (kg/mês)" type="number" min={1} value={lowEstimate} onChange={(e) => setLowEstimate(e.target.value)} />
                  <Input label="Total anual" type="number" value={String(totalAnnualProduction)} readOnly disabled />
                </div>
              </div>
            )}

            <label className="catalog-checkbox">
              <input
                type="checkbox"
                checked={hasPrimaryPackaging}
                onChange={(e) => setHasPrimaryPackaging(e.target.checked)}
              />
              Embalagem Primária
            </label>

            {hasPrimaryPackaging && (
              <div className="catalog-packaging-row">
                <Input label="Info" value={primaryPackaging.info} onChange={(e) => setPrimaryPackaging((p) => ({ ...p, info: e.target.value }))} />
                <Select
                  label="Qual"
                  value={primaryPackaging.packagingId}
                  onChange={(e) => setPrimaryPackaging((p) => ({ ...p, packagingId: e.target.value }))}
                  placeholder="Selecione..."
                  options={packaging.map((p) => ({ value: p.id, label: p.name }))}
                />
                <Input label="Peso (KG)" type="number" value={primaryPackaging.weight} onChange={(e) => setPrimaryPackaging((p) => ({ ...p, weight: e.target.value }))} />
              </div>
            )}

            <label className="catalog-checkbox">
              <input
                type="checkbox"
                checked={hasSecondaryPackaging}
                onChange={(e) => setHasSecondaryPackaging(e.target.checked)}
              />
              Embalagem Secundária
            </label>

            {hasSecondaryPackaging && (
              <div className="catalog-packaging-row">
                <Input label="Info" value={secondaryPackaging.info} onChange={(e) => setSecondaryPackaging((p) => ({ ...p, info: e.target.value }))} />
                <Select
                  label="Qual"
                  value={secondaryPackaging.packagingId}
                  onChange={(e) => setSecondaryPackaging((p) => ({ ...p, packagingId: e.target.value }))}
                  placeholder="Selecione..."
                  options={packaging.map((p) => ({ value: p.id, label: p.name }))}
                />
                <Input label="Peso (KG)" type="number" value={secondaryPackaging.weight} onChange={(e) => setSecondaryPackaging((p) => ({ ...p, weight: e.target.value }))} />
              </div>
            )}

            <div className="catalog-modal-footer">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !canSave}>
                {isEdit ? 'Salvar' : 'Cadastrar Produto'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ShowImageModal open={Boolean(previewSrc)} src={previewSrc ?? ''} onClose={() => setPreviewSrc(null)} />
    </>
  )
}
