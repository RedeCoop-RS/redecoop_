import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Seo } from '@/components/Seo'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { environment } from '@/config/environment'
import { ghostService, rewriteGhostAssetUrl } from '@/services/ghost.service'
import type { GhostPost, GhostTag } from '@/types'
import '@/styles/blog.css'

const PAGE_SIZE = 50

function isPublicTag(t: GhostTag): boolean {
  if (t.slug?.toLowerCase().startsWith('hash-')) return false
  if (t.name.startsWith('hash-') || t.name === 'internal') return false
  return true
}

interface TagSection {
  tag: GhostTag
  posts: GhostPost[]
  count: number
}

export function BlogPage() {
  const [posts, setPosts] = useState<GhostPost[]>([])
  const [meta, setMeta] = useState<{ pagination: { page: number; limit: number; pages: number; total: number } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTagSlug, setActiveTagSlug] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 260)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadPosts = useCallback(async (page: number, append = false) => {
    if (append) setLoadingMore(true)
    else { setLoading(true); setError(false) }
    try {
      const res = await ghostService.getPosts(PAGE_SIZE, page)
      setPosts((prev) => (append ? [...prev, ...res.posts] : res.posts))
      setMeta(res.meta ?? null)
      setCurrentPage(page)
    } catch {
      setError(true)
      if (!append) setPosts([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    loadPosts(1)
  }, [loadPosts])

  const exploreMode = !searchQuery && activeTagSlug === null

  const tagChips = useMemo(() => {
    const bySlug = new Map<string, GhostTag>()
    for (const p of posts) {
      for (const t of p.tags ?? []) {
        if (!isPublicTag(t)) continue
        if (!bySlug.has(t.slug)) bySlug.set(t.slug, t)
      }
    }
    return Array.from(bySlug.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
    )
  }, [posts])

  const visiblePosts = useMemo(() => {
    let list = [...posts]
    if (activeTagSlug) {
      list = list.filter((p) => p.tags?.some((t) => t.slug === activeTagSlug))
    }
    if (searchQuery) {
      list = list.filter((p) => {
        const title = p.title.toLowerCase()
        const excerpt = (p.excerpt ?? '').toLowerCase()
        const tags = (p.tags ?? []).map((t) => t.name.toLowerCase()).join(' ')
        const author = p.authors?.[0]?.name.toLowerCase() ?? ''
        return (
          title.includes(searchQuery) ||
          excerpt.includes(searchQuery) ||
          tags.includes(searchQuery) ||
          author.includes(searchQuery)
        )
      })
    }
    return list
  }, [posts, activeTagSlug, searchQuery])

  const featuredPost = exploreMode && posts.length > 0 ? posts[0] : null

  const gridPosts = useMemo(() => {
    if (exploreMode && featuredPost) {
      return visiblePosts.filter((p) => p.id !== featuredPost.id)
    }
    return visiblePosts
  }, [visiblePosts, exploreMode, featuredPost])

  const tagSections = useMemo((): TagSection[] => {
    if (!exploreMode) return []
    const sections: TagSection[] = []
    for (const tag of tagChips) {
      const inTag = posts.filter((p) => p.tags?.some((t) => t.slug === tag.slug))
      if (inTag.length >= 2) {
        sections.push({ tag, posts: inTag.slice(0, 16), count: inTag.length })
      }
    }
    return sections.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [exploreMode, tagChips, posts])

  const totalPages = meta?.pagination.pages ?? 1
  const totalPostsRemote = meta?.pagination.total ?? posts.length

  const clearFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setActiveTagSlug(null)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const authorName = (p: GhostPost) => p.authors?.[0]?.name
  const siteUrl = environment.siteUrl.replace(/\/$/, '')

  return (
    <>
      <Seo
        title="Blog"
        description="Notícias e artigos da RedeCoop RS sobre cooperativismo, agricultura familiar e economia solidária no Rio Grande do Sul."
        path="/blog"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'Blog RedeCoop',
            url: `${siteUrl}/blog`,
            description:
              'Notícias e artigos sobre cooperativismo, agricultura familiar e economia solidária no Rio Grande do Sul.',
            publisher: { '@type': 'Organization', name: 'RedeCoop RS', url: siteUrl },
          },
        ]}
      />
      <Navbar />

      <main className="blog-verge">
        <div className="blog-verge__masthead">
          <div className="blog-verge__stripe blog-verge__stripe--ink" />
          <div className="blog-verge__stripe blog-verge__stripe--volt" />
          <div className="blog-verge__stripe blog-verge__stripe--forest" />
        </div>

        <section className="editorial-header">
          <div className="blog-verge__inner">
            <div className="editorial-header-inner">
              <div className="editorial-kicker">
                <span className="editorial-kicker__dot" />
                <span className="editorial-kicker__label">Publicação</span>
              </div>
              <h1 className="editorial-title">
                Blog <span className="editorial-title-accent">RedeCoop</span>
              </h1>
              <p className="editorial-subtitle">
                Cooperativismo · Agricultura familiar · Rio Grande do Sul
              </p>
            </div>

            {!loading && !error && (
              <div className="blog-toolbar">
                <label className="blog-search" htmlFor="blog-search-input">
                  <span className="blog-search__icon" aria-hidden="true">
                    <Search size={22} />
                  </span>
                  <input
                    id="blog-search-input"
                    type="search"
                    className="blog-search__input"
                    placeholder="Pesquisar por título, tema, autor ou palavra-chave…"
                    autoComplete="off"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {(searchInput || activeTagSlug) && (
                    <button
                      type="button"
                      className="blog-search__clear"
                      onClick={clearFilters}
                      aria-label="Limpar pesquisa e filtros"
                    >
                      Limpar
                    </button>
                  )}
                </label>

                {meta && (
                  <div className="blog-stats">
                    <span className="blog-stats__pill">
                      <strong>{totalPostsRemote}</strong> artigos no blog
                    </span>
                    {totalPages > 1 && (
                      <span className="blog-stats__pill blog-stats__pill--muted">
                        {posts.length} carregados nesta sessão
                      </span>
                    )}
                  </div>
                )}

                {tagChips.length > 0 && (
                  <div className="tag-chip-row">
                    <button
                      type="button"
                      className={`tag-chip ${activeTagSlug === null ? 'tag-chip--active' : ''}`}
                      onClick={() => setActiveTagSlug(null)}
                    >
                      Todos
                    </button>
                    {tagChips.map((tag) => (
                      <button
                        key={tag.slug}
                        type="button"
                        className={`tag-chip ${activeTagSlug === tag.slug ? 'tag-chip--active' : ''}`}
                        onClick={() => setActiveTagSlug(tag.slug === activeTagSlug ? null : tag.slug)}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {loading && (
          <div className="blog-verge__inner editorial-main">
            <div className="sk-cards-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="sk-card-cell blog-shimmer" />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="blog-verge__inner blog-empty">
            <p>Não foi possível carregar os posts.</p>
            <button type="button" className="btn-editorial-green mt-3" onClick={() => loadPosts(1)}>
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="blog-verge__inner blog-empty">
            <p>Nenhum post publicado ainda. Volte em breve!</p>
          </div>
        )}

        {!loading && !error && featuredPost && (
          <section className="blog-feature-wrap">
            <div className="blog-verge__inner">
              <Link to={`/blog/${featuredPost.slug}`} className="blog-feature">
                <div className="blog-feature__media">
                  {featuredPost.feature_image ? (
                    <OptimizedImage
                      src={rewriteGhostAssetUrl(featuredPost.feature_image)}
                      alt={featuredPost.feature_image_alt || featuredPost.title}
                      className="blog-feature__img"
                      eager
                      fetchPriority="high"
                    />
                  ) : (
                    <div className="blog-feature__media-fallback" />
                  )}
                  <div className="blog-feature__veil" />
                </div>
                <div className="blog-feature__content">
                  <span className="blog-feature__kicker">Em destaque</span>
                  {featuredPost.tags && featuredPost.tags.length > 0 && (
                    <div className="blog-feature__tags">
                      {featuredPost.tags.slice(0, 4).map((t) => (
                        <span key={t.id} className="blog-feature__tag">{t.name}</span>
                      ))}
                    </div>
                  )}
                  <h2 className="blog-feature__title">{featuredPost.title}</h2>
                  {featuredPost.excerpt && (
                    <p className="blog-feature__excerpt">{featuredPost.excerpt}</p>
                  )}
                  <div className="blog-feature__meta">
                    {authorName(featuredPost) && <span>{authorName(featuredPost)}</span>}
                    {authorName(featuredPost) && <span> · </span>}
                    <span>{formatDate(featuredPost.published_at)}</span>
                    {featuredPost.reading_time && (
                      <span> · {featuredPost.reading_time} min de leitura</span>
                    )}
                  </div>
                  <span className="blog-feature__cta">Ler artigo completo →</span>
                </div>
              </Link>
            </div>
          </section>
        )}

        {!loading && !error && exploreMode && tagSections.map((sec, si) => (
          <section key={sec.tag.slug} className="tag-rail-section">
            <div className="blog-verge__inner">
              <div className="tag-rail-head">
                <h3 className="tag-rail-head__title">
                  <span className="tag-rail-head__bar" aria-hidden="true" />
                  {sec.tag.name}
                </h3>
                <span className="tag-rail-head__count">{sec.count} artigos</span>
              </div>
              <div
                className="tag-rail-scroll"
                role="region"
                aria-label={`Artigos na categoria ${sec.tag.name}`}
              >
                <div className="tag-rail-track">
                  {sec.posts.map((post, idx) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="tag-rail-card"
                      style={{ animationDelay: `${si * 40 + idx * 28}ms` }}
                    >
                      <div className="tag-rail-card__media">
                        {post.feature_image ? (
                          <OptimizedImage
                            src={rewriteGhostAssetUrl(post.feature_image)}
                            alt={post.feature_image_alt || post.title}
                            loading="lazy"
                            placeholder
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="tag-rail-card__fallback" />
                        )}
                      </div>
                      <div className="tag-rail-card__body">
                        <h4 className="tag-rail-card__title">{post.title}</h4>
                        <span className="tag-rail-card__meta">{formatDate(post.published_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}

        {!loading && !error && posts.length > 0 && (
          <div className="blog-verge__inner editorial-main">
            {(!exploreMode || searchQuery || activeTagSlug) && (
              <div className="explore-head">
                <h3 className="explore-head__title">
                  {searchQuery ? 'Resultados da pesquisa' : 'Filtrado por tag'}
                </h3>
                <p className="explore-head__hint">
                  {gridPosts.length}{' '}
                  {gridPosts.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}
                </p>
              </div>
            )}

            {exploreMode && !searchQuery && !activeTagSlug && (
              <div className="explore-head">
                <h3 className="explore-head__title">Explorar todos</h3>
                <p className="explore-head__hint">Passe o mouse nos cartões · role as seções por tema</p>
              </div>
            )}

            {gridPosts.length === 0 && (
              <div className="blog-empty">
                <p className="mb-2">Nenhum artigo corresponde à pesquisa ou ao filtro.</p>
                <button type="button" className="btn-editorial-green" onClick={clearFilters}>
                  Mostrar tudo de novo
                </button>
              </div>
            )}

            {gridPosts.length > 0 && (
              <div className="blog-cards-grid">
                {gridPosts.map((post, i) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="blog-card-link"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <article className="blog-card">
                      <div className="blog-card__media">
                        {post.feature_image ? (
                          <OptimizedImage
                            src={rewriteGhostAssetUrl(post.feature_image)}
                            alt={post.feature_image_alt || post.title}
                            className="blog-card__img"
                            loading="lazy"
                            placeholder
                          />
                        ) : (
                          <div className="blog-card__media-fallback" />
                        )}
                      </div>
                      <div className="blog-card__body">
                        {post.tags && post.tags.length > 0 && (
                          <div className="tag-bar">
                            {post.tags.slice(0, 3).map((t) => (
                              <span key={t.id} className="ev-tag">{t.name}</span>
                            ))}
                          </div>
                        )}
                        <h2 className="blog-card__title">{post.title}</h2>
                        {post.excerpt && (
                          <p className="blog-card__excerpt">{post.excerpt}</p>
                        )}
                        <div className="blog-card__meta ev-meta">
                          {authorName(post) && (
                            <span className="ev-author">{authorName(post)}</span>
                          )}
                          {authorName(post) && <span className="ev-sep"> · </span>}
                          <span className="ev-date">{formatDate(post.published_at)}</span>
                          {post.reading_time && <span> · {post.reading_time} min</span>}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {exploreMode && currentPage < totalPages && (
              <div className="load-more-bar">
                <button
                  type="button"
                  className="btn-load-more"
                  disabled={loadingMore}
                  onClick={() => loadPosts(currentPage + 1, true)}
                >
                  {loadingMore ? 'Carregando…' : 'Carregar mais artigos'}
                </button>
                <p className="load-more-bar__hint">
                  Página {currentPage} de {totalPages} · até {totalPostsRemote} no total
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer withMarginTop={false} />
    </>
  )
}
