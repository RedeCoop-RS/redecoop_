import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, FileSpreadsheet } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BudgetForm } from '@/components/forms/BudgetForm'
import { CoopSelect } from '@/components/cooperatives/CoopSelect'
import { RsMap } from '@/components/map/RsMap'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { environment } from '@/config/environment'
import { downloadCatalogCsv, downloadCatalogExcelXml } from '@/lib/catalog-export'
import { formatCapacitySummary, formatSeasonalitySummary } from '@/lib/catalog-format'
import { cooperativeService } from '@/services/cooperative.service'
import { productService } from '@/services/product.service'
import type { Cooperative, CooperativeSummary, ProductCategory, ProductType, PublicCatalogProduct } from '@/types'
import '@/styles/cooperatives.css'

const ALL_ID = 0

function labelOf(value?: string | { name?: string }) {
  if (!value) return null
  return typeof value === 'string' ? value : value.name ?? null
}

export function CooperativesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [cooperatives, setCooperatives] = useState<CooperativeSummary[]>([])
  const [selectedId, setSelectedId] = useState<number>(ALL_ID)
  const [cooperative, setCooperative] = useState<Cooperative | null>(null)
  const [products, setProducts] = useState<PublicCatalogProduct[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [types, setTypes] = useState<ProductType[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [typeId, setTypeId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    cooperativeService.getCooperatives().then(setCooperatives).catch(() => {})
    productService.getCategories().then(setCategories).catch(() => {})
    productService.getTypes().then(setTypes).catch(() => {})
  }, [])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) setSelectedId(Number(id))
  }, [searchParams])

  useEffect(() => {
    if (selectedId && selectedId !== ALL_ID) {
      cooperativeService.getCooperative(selectedId).then(setCooperative).catch(() => setCooperative(null))
    } else {
      setCooperative(null)
    }
  }, [selectedId])

  useEffect(() => {
    setLoading(true)
    cooperativeService
      .listCatalogProducts({
        cooperativeId: selectedId === ALL_ID ? null : selectedId,
        page,
        limit: 30,
        categoryId,
        typeId,
      })
      .then((res) => {
        setProducts(Array.isArray(res.data) ? res.data : [])
        setTotalPages(res.meta?.totalPages ?? 1)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [selectedId, page, categoryId, typeId])

  const storageUrl = (path?: string) =>
    path ? `${environment.storageUrl}${path}` : '/assets/imgs/default-cooperative.png'

  const handleSelectCoop = (id: number) => {
    setSelectedId(id)
    setPage(1)
    if (id === ALL_ID) navigate('/cooperativas')
    else navigate(`/cooperativas?id=${id}`)
  }

  const scrollToBudget = () => {
    document.getElementById('orcamento')?.scrollIntoView({ behavior: 'smooth' })
  }

  const displayName = cooperative
    ? cooperative.fantasyName || cooperative.companyName
    : null

  const showCoopColumn = selectedId === ALL_ID

  const seasonalityCell = (row: PublicCatalogProduct) =>
    formatSeasonalitySummary(row) || '—'

  const quantityCell = (row: PublicCatalogProduct) =>
    formatCapacitySummary(row) || '—'

  const handleExport = async (kind: 'csv' | 'xls') => {
    setExporting(true)
    try {
      const res = await cooperativeService.listCatalogProducts({
        cooperativeId: selectedId === ALL_ID ? null : selectedId,
        page: 1,
        limit: -1,
        categoryId,
        typeId,
      })
      const options = { includeCooperative: showCoopColumn }
      if (kind === 'csv') downloadCatalogCsv(res.data, options)
      else downloadCatalogExcelXml(res.data, options)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="coop-page">
      <Navbar />

      <section className="coop-profile">
        <div className="coop-inner">
          <div className="coop-profile__grid">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="coop-profile__aside"
            >
              <h2 className="coop-profile__heading">
                Conheça mais sobre nossas cooperativas associadas!
              </h2>

              <CoopSelect
                value={selectedId}
                placeholder="Nome da cooperativa"
                options={cooperatives.map((c) => ({
                  value: c.id,
                  label: c.selectLabel || c.fantasyName || c.companyName,
                }))}
                onChange={handleSelectCoop}
              />

              {cooperative ? (
                <>
                  <div className="coop-info">
                    <div className="coop-info__logo-wrap">
                      <img
                        src={storageUrl(cooperative.img)}
                        alt={displayName ?? 'Cooperativa'}
                        className="coop-info__logo"
                      />
                    </div>
                    <div>
                      <p className="coop-info__name">{displayName}</p>
                      {cooperative.city?.name && (
                        <p className="coop-info__meta">{cooperative.city.name}</p>
                      )}
                      {cooperative.cnpj && (
                        <p className="coop-info__meta">
                          <strong>CNPJ:</strong> {cooperative.cnpj}
                        </p>
                      )}
                    </div>
                  </div>

                  {cooperative.description && (
                    <p className="coop-info__desc">{cooperative.description}</p>
                  )}

                  <button type="button" onClick={scrollToBudget} className="coop-quote-btn">
                    Solicitar orçamento
                    <CheckCircle size={18} />
                  </button>
                </>
              ) : (
                <p className="coop-hint">
                  Selecione a cooperativa no botão acima ou clicando sobre o mapa ao lado →
                </p>
              )}
            </motion.div>

            <div className="coop-profile__map">
              <RsMap size="large" />
            </div>
          </div>
        </div>
      </section>

      <section className="coop-catalog">
        <div className="coop-inner">
          <div className="coop-catalog__header">
            <h2 className="coop-catalog__title">Catálogo de Produtos</h2>
            <div className="coop-catalog__filters">
              <select
                value={typeId ?? ''}
                onChange={(e) => {
                  setTypeId(e.target.value ? Number(e.target.value) : null)
                  setPage(1)
                }}
                className="coop-filter"
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos os tipos</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                value={categoryId ?? ''}
                onChange={(e) => {
                  setCategoryId(e.target.value ? Number(e.target.value) : null)
                  setPage(1)
                }}
                className="coop-filter"
                aria-label="Filtrar por categoria"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="coop-catalog__toolbar">
            <div className="coop-catalog__view-toggle" role="group" aria-label="Modo de visualização">
              <button
                type="button"
                className={`coop-catalog__view-btn${viewMode === 'cards' ? ' coop-catalog__view-btn--active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                Cartões
              </button>
              <button
                type="button"
                className={`coop-catalog__view-btn${viewMode === 'table' ? ' coop-catalog__view-btn--active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                Tabela
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key={viewMode === 'cards' ? 'loading-cards' : 'loading-table'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {viewMode === 'cards' ? (
                  <div className="coop-products">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="coop-skeleton" />
                    ))}
                  </div>
                ) : (
                  <div className="coop-table-wrap coop-table-wrap--loading">
                    <div className="coop-skeleton coop-skeleton--table" />
                  </div>
                )}
              </motion.div>
            ) : products.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="coop-empty"
              >
                Nenhum produto encontrado.
              </motion.p>
            ) : viewMode === 'cards' ? (
              <motion.div
                key="cards"
                className="coop-products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {products.map((p) => {
                  const categoryName = labelOf(p.productCategory)
                  return (
                    <article key={p.catalogId} className="coop-product">
                      <OptimizedImage
                        src={storageUrl(p.img)}
                        alt={p.productName}
                        className="coop-product__img"
                        loading="lazy"
                        placeholder
                      />
                      <div className="coop-product__body">
                        {showCoopColumn && (
                          <p className="coop-product__coop">{p.cooperativeDisplayName}</p>
                        )}
                        <p className="coop-product__name">{p.productName}</p>
                        {categoryName && (
                          <span className="coop-product__tag">{categoryName}</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </motion.div>
            ) : (
              <motion.div
                key="table"
                className="coop-table-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="coop-table-export"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="coop-table-export__label">
                    <FileSpreadsheet size={17} aria-hidden />
                    <span>Exportar tabela</span>
                  </div>
                  <div className="coop-table-export__actions">
                    <button
                      type="button"
                      className="coop-table-export__btn"
                      disabled={exporting}
                      onClick={() => handleExport('csv')}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      className="coop-table-export__btn coop-table-export__btn--primary"
                      disabled={exporting}
                      onClick={() => handleExport('xls')}
                    >
                      Excel
                    </button>
                  </div>
                </motion.div>
                <div className="coop-table-wrap">
                  <table className="coop-table">
                    <thead>
                      <tr>
                        {showCoopColumn && <th>Cooperativa</th>}
                        <th>Produto</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Sazonalidade</th>
                        <th>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.catalogId}>
                          {showCoopColumn && <td>{p.cooperativeDisplayName}</td>}
                          <td>{p.productName}</td>
                          <td>{labelOf(p.productType) ?? '—'}</td>
                          <td>{labelOf(p.productCategory) ?? '—'}</td>
                          <td>{seasonalityCell(p)}</td>
                          <td>{quantityCell(p)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {totalPages > 1 && (
            <div className="coop-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="coop-pagination__btn"
              >
                Anterior
              </button>
              <span className="coop-pagination__info">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="coop-pagination__btn"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="orcamento" className="coop-budget">
        <div className="coop-inner">
          <div className="coop-budget__card">
            <BudgetForm />
          </div>
        </div>
      </section>

      <Footer withMarginTop={false} />
    </div>
  )
}
