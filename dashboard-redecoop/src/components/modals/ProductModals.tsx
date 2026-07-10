import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { PicturePicker } from '@/components/ui/PicturePicker'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { productService } from '@/services/product.service'
import { resolveStorageUrl } from '@/lib/storage'
import type { Product } from '@/types'

interface ProductModalProps {
  open: boolean
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

export function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const [name, setName] = useState('')
  const [productTypeId, setProductTypeId] = useState('')
  const [productCategoryId, setProductCategoryId] = useState('')
  const [types, setTypes] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingImage, setExistingImage] = useState('')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setImageFile(null)
    setExistingImage(product?.img ? resolveStorageUrl(product.img) : '')
    setLoading(Boolean(product))

    const requests: Promise<unknown>[] = [
      productService.types(),
      productService.categories(),
    ]
    if (product) requests.push(productService.getById(product.id))

    Promise.all(requests)
      .then((results) => {
        const [t, c, fullProduct] = results as [
          { id: number; name: string }[],
          { id: number; name: string }[],
          Product | undefined,
        ]
        setTypes(t)
        setCategories(c)

        if (product && fullProduct) {
          setName(fullProduct.name)
          setProductTypeId(String(fullProduct.productTypeId ?? fullProduct.type?.id ?? ''))
          setProductCategoryId(String(fullProduct.productCategoryId ?? fullProduct.category?.id ?? ''))
          if (fullProduct.img) setExistingImage(resolveStorageUrl(fullProduct.img))
        } else {
          setName('')
          setProductTypeId('')
          setProductCategoryId('')
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar produto')
      })
      .finally(() => setLoading(false))
  }, [open, product])

  const save = async () => {
    if (!product && !imageFile) {
      toast.error('Você deve inserir a imagem do produto.')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = { name, productTypeId, productCategoryId }
      if (imageFile) payload.img = imageFile

      if (product) await productService.update(product.id, payload)
      else await productService.create(payload)

      toast.success(product ? 'Produto atualizado!' : 'Produto criado!')
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
      <Modal open={open} onClose={onClose} title={product ? 'Editar produto' : 'Novo produto'} size="md">
        <div className="space-y-4">
          <PicturePicker
            existingSrc={existingImage}
            file={imageFile}
            onChange={setImageFile}
            onPreviewClick={setPreviewSrc}
            onClear={() => setExistingImage('')}
          />
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select
            label="Tipo"
            value={productTypeId}
            onChange={(e) => setProductTypeId(e.target.value)}
            placeholder="Selecione..."
            options={types.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Select
            label="Categoria"
            value={productCategoryId}
            onChange={(e) => setProductCategoryId(e.target.value)}
            placeholder="Selecione..."
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={saving || loading || !name}>Salvar</Button>
          </div>
        </div>
      </Modal>
      <ShowImageModal open={Boolean(previewSrc)} src={previewSrc ?? ''} onClose={() => setPreviewSrc(null)} />
    </>
  )
}

export { CatalogProductModal } from '@/components/modals/CatalogProductModal'