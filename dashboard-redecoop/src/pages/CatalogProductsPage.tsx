import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  catalogService,
  productService,
  type CategoryCount,
  type ProductListFilters,
} from '@/services/product.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { CatalogProductModal } from '@/components/modals/CatalogProductModal'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { resolveStorageUrl } from '@/lib/storage'
import { useModal } from '@/contexts/ModalContext'
import type { CatalogProduct } from '@/types'

const ITEMS_PER_PAGE = 20

function displayCatalogImg(item: CatalogProduct) {
  const own = item.customImage?.trim()
  if (own) return own
  return item.product?.img ?? item.img ?? null
}

export function CatalogProductsPage() {
  const { confirm } = useModal()
  const [rows, setRows] = useState<CatalogProduct[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [searchName, setSearchName] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<ProductListFilters>({})

  const [types, setTypes] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [chipCounts, setChipCounts] = useState<CategoryCount[]>([])
  const [grandTotal, setGrandTotal] = useState(0)

  const [editItem, setEditItem] = useState<CatalogProduct | null | undefined>(undefined)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const refreshChips = useCallback(async (filters: ProductListFilters) => {
    try {
      const counts = await catalogService.countByCategory({
        typeId: filters.typeId,
        name: filters.name,
      })
      setChipCounts(counts)
      setGrandTotal(counts.reduce((sum, item) => sum + item.total, 0))
    } catch {
      setChipCounts([])
      setGrandTotal(0)
    }
  }, [])

  useEffect(() => {
    productService.types().then(setTypes)
    productService.categories().then(setCategories)
    refreshChips({})
  }, [refreshChips])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await catalogService.list(page, ITEMS_PER_PAGE, appliedFilters)
      setRows(result.data)
      setTotal(result.meta.totalItems ?? result.data.length)
    } catch {
      toast.error('Erro ao carregar produtos')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, appliedFilters])

  useEffect(() => {
    load()
  }, [load])

  const applyFilters = () => {
    const filters: ProductListFilters = {
      typeId: selectedType || undefined,
      categoryId: selectedCategory || undefined,
      name: searchName || undefined,
    }
    setPage(1)
    setAppliedFilters(filters)
    refreshChips(filters)
  }

  const clearSummaryFilters = () => {
    setSearchName('')
    setSelectedType('')
    setSelectedCategory('')
    const filters: ProductListFilters = {}
    setPage(1)
    setAppliedFilters(filters)
    refreshChips(filters)
  }

  const filterByCategoryShortcut = (categoryId: number) => {
    setSelectedCategory(String(categoryId))
    const filters: ProductListFilters = {
      typeId: selectedType || undefined,
      categoryId: String(categoryId),
      name: searchName || undefined,
    }
    setPage(1)
    setAppliedFilters(filters)
    refreshChips(filters)
  }

  const remove = async (row: CatalogProduct) => {
    const ok = await confirm({
      title: 'Deseja Remover o Produto do Catálogo?',
      message: 'Essa ação é irreversível.',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await catalogService.remove(row.id)
      toast.success('Produto removido do catálogo')
      load()
      refreshChips(appliedFilters)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  return (
    <div className="products-page catalog-products-page">
      <PageHeader title="Meus Produtos" description="Catálogo de produtos da sua cooperativa." />

      <div className="products-filters">
        <Input
          label="Buscar no nome"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          placeholder="Ex.: alface (encontra Alface crespa, etc.)"
        />
        <Select
          label="Tipo"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          placeholder="Qualquer"
          options={types.map((t) => ({ value: t.id, label: t.name }))}
        />
        <Select
          label="Categoria"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          placeholder="Qualquer"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Button onClick={applyFilters} className="business-filters__btn">
          <Search size={16} />
          Buscar
        </Button>
      </div>

      <div className="products-toolbar">
        <div className="products-chips">
          <div>
            <p className="products-chips__title">Filtro rápido por categoria</p>
            <p className="products-chips__hint">
              Os totais por categoria usam o tipo e o texto de busca depois que você clica em buscar.
            </p>
          </div>
          <div className="products-chips__list">
            <button
              type="button"
              className={`products-chip${selectedCategory === '' && !appliedFilters.categoryId ? ' products-chip--active' : ''}`}
              onClick={clearSummaryFilters}
            >
              <span>Todos</span>
              <span>{grandTotal}</span>
            </button>
            {chipCounts.map((item) => (
              <button
                key={item.categoryId}
                type="button"
                className={`products-chip${selectedCategory === String(item.categoryId) ? ' products-chip--active' : ''}`}
                onClick={() => filterByCategoryShortcut(item.categoryId)}
              >
                <span>{item.categoryName}</span>
                <span>{item.total}</span>
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setEditItem(null)}>
          <Plus size={16} />
          Adicionar Produto
        </Button>
      </div>

      <div className="business-table-card">
        <div className="business-table-wrap catalog-products-table-wrap">
          <table className="business-table catalog-products-table table-cards-mobile">
            <colgroup>
              <col className="catalog-col-image" />
              <col className="catalog-col-name" />
              <col className="catalog-col-type" />
              <col className="catalog-col-category" />
              <col className="catalog-col-seasonality" />
              <col className="catalog-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Sazonalidade</th>
                <th className="catalog-col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j}>
                        <span className="coops-skeleton" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="Nenhum registro encontrado" />
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => {
                  const img = displayCatalogImg(row)
                  return (
                    <tr key={row.id}>
                      <td data-label="Imagem">
                        {img ? (
                          <button
                            type="button"
                            className="business-link"
                            onClick={() => setPreviewImage(resolveStorageUrl(img))}
                          >
                            Ver
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-label="Nome" className="catalog-col-name">{row.product?.name ?? row.name ?? '—'}</td>
                      <td data-label="Tipo">{row.product?.productType?.name ?? row.type?.name ?? '—'}</td>
                      <td data-label="Categoria">{row.product?.productCategory?.name ?? row.category?.name ?? '—'}</td>
                      <td data-label="Sazonalidade">
                        <span className={`badge ${row.hasSeasonality ? 'badge--green' : 'badge--muted'}`}>
                          {row.hasSeasonality ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td data-label="Ações" className="catalog-col-actions">
                        <div className="catalog-actions">
                          <button
                            type="button"
                            className="catalog-action-btn catalog-action-btn--edit"
                            onClick={() => setEditItem(row)}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="catalog-action-btn catalog-action-btn--delete"
                            onClick={() => remove(row)}
                          >
                            <Trash2 size={14} />
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} total={total} limit={ITEMS_PER_PAGE} onPageChange={setPage} />

      <CatalogProductModal
        open={editItem !== undefined}
        item={editItem}
        onClose={() => setEditItem(undefined)}
        onSaved={() => {
          load()
          refreshChips(appliedFilters)
        }}
      />
      <ShowImageModal open={Boolean(previewImage)} src={previewImage ?? ''} onClose={() => setPreviewImage(null)} />
    </div>
  )
}
