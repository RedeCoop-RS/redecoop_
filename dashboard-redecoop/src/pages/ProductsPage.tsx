import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Search, Trash2, ZoomIn } from 'lucide-react'
import { productService, type CategoryCount, type ProductListFilters } from '@/services/product.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableActionsMenu } from '@/components/ui/TableActionsMenu'
import { ProductModal } from '@/components/modals/ProductModals'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { resolveStorageUrl } from '@/lib/storage'
import { useModal } from '@/contexts/ModalContext'
import type { Product } from '@/types'

function ProductFilters({
  searchName,
  selectedType,
  selectedCategory,
  types,
  categories,
  onSearchNameChange,
  onTypeChange,
  onCategoryChange,
  onApply,
}: {
  searchName: string
  selectedType: string
  selectedCategory: string
  types: { id: number; name: string }[]
  categories: { id: number; name: string }[]
  onSearchNameChange: (v: string) => void
  onTypeChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onApply: () => void
}) {
  return (
    <div className="products-filters">
      <Input
        label="Buscar no nome"
        value={searchName}
        onChange={(e) => onSearchNameChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
        placeholder="Ex.: alface"
      />
      <Select
        label="Tipo"
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value)}
        placeholder="Qualquer"
        options={types.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Select
        label="Categoria"
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        placeholder="Qualquer"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />
      <Button onClick={onApply} className="business-filters__btn">
        <Search size={16} />
        Filtrar
      </Button>
    </div>
  )
}

function CategoryChips({
  counts,
  grandTotal,
  selectedCategory,
  onSelect,
}: {
  counts: CategoryCount[]
  grandTotal: number
  selectedCategory: string
  onSelect: (categoryId: string) => void
}) {
  return (
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
          className={`products-chip${selectedCategory === '' ? ' products-chip--active' : ''}`}
          onClick={() => onSelect('')}
        >
          <span>Todos</span>
          <span>{grandTotal}</span>
        </button>
        {counts.map((item) => (
          <button
            key={item.categoryId}
            type="button"
            className={`products-chip${selectedCategory === String(item.categoryId) ? ' products-chip--active' : ''}`}
            onClick={() => onSelect(String(item.categoryId))}
          >
            <span>{item.categoryName}</span>
            <span>{item.total}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProductsPage() {
  const { confirm } = useModal()
  const [rows, setRows] = useState<Product[]>([])
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

  const [editProduct, setEditProduct] = useState<Product | null | undefined>(undefined)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const refreshChips = useCallback(async (filters: ProductListFilters) => {
    try {
      const counts = await productService.countByCategory({
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
      const result = await productService.listAdmin(page, 10, appliedFilters)
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

  const remove = async (row: Product) => {
    const ok = await confirm({ message: `Excluir produto "${row.name}"?`, variant: 'danger' })
    if (!ok) return
    try {
      await productService.delete(row.id)
      toast.success('Produto excluído!')
      load()
      refreshChips(appliedFilters)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  return (
    <div className="products-page">
      <PageHeader title="Produtos" description="Catálogo global de produtos da RedeCoop." />

      <ProductFilters
        searchName={searchName}
        selectedType={selectedType}
        selectedCategory={selectedCategory}
        types={types}
        categories={categories}
        onSearchNameChange={setSearchName}
        onTypeChange={setSelectedType}
        onCategoryChange={setSelectedCategory}
        onApply={applyFilters}
      />

      <div className="products-toolbar">
        <CategoryChips
          counts={chipCounts}
          grandTotal={grandTotal}
          selectedCategory={selectedCategory}
          onSelect={(categoryId) => {
            setSelectedCategory(categoryId)
            const filters: ProductListFilters = {
              typeId: selectedType || undefined,
              categoryId: categoryId || undefined,
              name: searchName || undefined,
            }
            setPage(1)
            setAppliedFilters(filters)
            refreshChips(filters)
          }}
        />
        <Button onClick={() => setEditProduct(null)}>
          <Plus size={16} />
          Adicionar Produto
        </Button>
      </div>

      <div className="business-table-card dashboard-scroll">
        <table className="business-table table-cards-mobile">
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j}>
                      <span className="coops-skeleton" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState title="Nenhum registro encontrado" />
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Imagem">
                    {row.img ? (
                      <button
                        type="button"
                        className="coops-thumb"
                        title="Ampliar imagem"
                        onClick={() => setPreviewImage(resolveStorageUrl(row.img))}
                      >
                        <img src={resolveStorageUrl(row.img)} alt={row.name} loading="lazy" />
                        <span className="coops-thumb__zoom" aria-hidden>
                          <ZoomIn size={12} strokeWidth={2.5} />
                        </span>
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-label="Nome">{row.name}</td>
                  <td data-label="Tipo">{row.type?.name ?? row.productType?.name ?? '—'}</td>
                  <td data-label="Categoria">{row.category?.name ?? row.productCategory?.name ?? '—'}</td>
                  <td data-label="Ações">
                    <TableActionsMenu
                      row={row}
                      actions={[
                        {
                          label: 'Editar',
                          icon: <Pencil size={15} />,
                          onClick: (product) => setEditProduct(product),
                        },
                        {
                          label: 'Excluir',
                          icon: <Trash2 size={15} />,
                          variant: 'danger',
                          onClick: (product) => void remove(product),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={10} onPageChange={setPage} />

      <ProductModal open={editProduct !== undefined} product={editProduct} onClose={() => setEditProduct(undefined)} onSaved={load} />
      <ShowImageModal open={Boolean(previewImage)} src={previewImage ?? ''} onClose={() => setPreviewImage(null)} />
    </div>
  )
}
