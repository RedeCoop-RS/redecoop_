import type { BlogPost } from '@/services/blog.service'
import { STATUS_LABEL } from '@/services/blog.service'
import type { BlogFilters } from './useBlog'

interface BlogListProps {
  resource: BlogFilters['resource']
  items: BlogPost[]
  loading: boolean
  total: number
  page: number
  totalPages: number
  tags: Array<{ slug: string; name: string }>
  authors: Array<{ slug: string; name: string }>
  status: string
  tag: string
  author: string
  order: string
  search: string
  selected: string[]
  onSearch: (value: string) => void
  onFilter: (patch: Partial<BlogFilters>) => void
  onSelect: (ids: string[]) => void
  onOpen: (id: string) => void
  onAction: (item: BlogPost, action: 'publish' | 'unpublish' | 'duplicate' | 'delete') => void
  onBulk: (action: 'publish' | 'unpublish' | 'delete') => void
}

const ORDERS = [
  ['updated_at desc', 'Atualizados recentemente'],
  ['published_at desc', 'Publicação mais recente'],
  ['created_at desc', 'Criados recentemente'],
  ['title asc', 'Título A–Z'],
  ['title desc', 'Título Z–A'],
]

export function BlogList(props: BlogListProps) {
  const all = props.items.length > 0 && props.items.every((item) => props.selected.includes(item.id))
  const noun = props.resource === 'page' ? 'página' : 'post'
  return (
    <section className="blog-list" aria-label={props.resource === 'page' ? 'Páginas' : 'Posts'}>
      <div className="blog-filters">
        <label className="blog-search">
          <span className="sr-only">Buscar no blog</span>
          <input aria-label="Buscar no blog" value={props.search} placeholder="Buscar por título ou slug" onChange={(event) => props.onSearch(event.target.value)} />
        </label>
        <select aria-label="Status" value={props.status} onChange={(event) => props.onFilter({ status: event.target.value })}>
          <option value="all">Todos os status</option>
          <option value="draft">Rascunhos</option>
          <option value="published">Publicados</option>
          <option value="scheduled">Agendados</option>
        </select>
        <select aria-label="Filtrar por tag" value={props.tag} onChange={(event) => props.onFilter({ tag: event.target.value })}>
          <option value="">Todas as tags</option>
          {props.tags.map((tag) => <option key={tag.slug} value={tag.slug}>{tag.name}</option>)}
        </select>
        <select aria-label="Filtrar por autor" value={props.author} onChange={(event) => props.onFilter({ author: event.target.value })}>
          <option value="">Todos os autores</option>
          {props.authors.map((author) => <option key={author.slug} value={author.slug}>{author.name}</option>)}
        </select>
        <select aria-label="Ordenar" value={props.order} onChange={(event) => props.onFilter({ order: event.target.value })}>
          {ORDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {props.selected.length > 0 && (
        <div className="blog-bulk" role="toolbar" aria-label="Ações em massa">
          <span>{props.selected.length} selecionado(s)</span>
          <button type="button" onClick={() => props.onBulk('publish')}>Subir</button>
          <button type="button" onClick={() => props.onBulk('unpublish')}>Derrubar</button>
          <button type="button" onClick={() => props.onBulk('delete')}>Excluir</button>
        </div>
      )}
      {props.loading && <p className="blog-empty">Carregando…</p>}
      {!props.loading && props.items.length === 0 && <p className="blog-empty">Nenhum {noun} com esses filtros.</p>}
      {!props.loading && props.items.length > 0 && (
        <div className="blog-table">
          <label className="blog-check blog-select-all">
            <input
              type="checkbox"
              aria-label="Selecionar todos"
              checked={all}
              onChange={() => props.onSelect(all ? [] : props.items.map((item) => item.id))}
            />
            Selecionar página
          </label>
          {props.items.map((item) => (
            <article key={item.id} className="blog-row" aria-label={item.title || 'Sem título'}>
              <label className="blog-check">
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${item.title || 'sem título'}`}
                  checked={props.selected.includes(item.id)}
                  onChange={() => props.onSelect(props.selected.includes(item.id) ? props.selected.filter((id) => id !== item.id) : [...props.selected, item.id])}
                />
              </label>
              <button type="button" className="blog-row__main" onClick={() => props.onOpen(item.id)}>
                <strong>{item.title || 'Sem título'}</strong>
                <span>{item.excerpt || item.slug}</span>
              </button>
              <div className="blog-row__meta">
                <span className={`blog-status blog-status--${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span>
                {item.featured && <span className="blog-pill">Destaque</span>}
                <span className="blog-row__tags">{item.tags.map((tag) => tag.name).join(', ')}</span>
                <div className="blog-row__actions">
                  <button type="button" onClick={() => props.onOpen(item.id)}>Editar</button>
                  {item.status !== 'published' && <button type="button" onClick={() => props.onAction(item, 'publish')}>Subir</button>}
                  {item.status !== 'draft' && <button type="button" onClick={() => props.onAction(item, 'unpublish')}>Derrubar</button>}
                  <button type="button" onClick={() => props.onAction(item, 'duplicate')}>Duplicar</button>
                  <button type="button" onClick={() => props.onAction(item, 'delete')}>Excluir</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <footer className="blog-pager">
        <button type="button" disabled={props.page <= 1} onClick={() => props.onFilter({ page: props.page - 1 })}>Anterior</button>
        <span>Página {props.page} de {props.totalPages} · {props.total} no total</span>
        <button type="button" disabled={props.page >= props.totalPages} onClick={() => props.onFilter({ page: props.page + 1 })}>Próxima</button>
      </footer>
    </section>
  )
}
