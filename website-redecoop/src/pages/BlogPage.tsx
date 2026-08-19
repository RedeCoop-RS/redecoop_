import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Seo } from '@/components/Seo'
import { JoinRedeCoopCta } from '@/components/JoinRedeCoopCta'
import { BlogPostCard } from '@/components/blog/BlogPostCard'
import { environment } from '@/config/environment'
import { ghostService } from '@/services/ghost.service'
import { formatGhostTagName, isPublicTag } from '@/lib/blog'
import type { GhostPost, GhostTag } from '@/types'
import '@/styles/blog.css'

const PAGE_SIZE = 50

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
    else {
      setLoading(true)
      setError(false)
    }
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

  const tagChips = useMemo(() => {
    const bySlug = new Map<string, GhostTag>()
    for (const p of posts) {
      for (const t of p.tags ?? []) {
        if (!isPublicTag(t)) continue
        if (!bySlug.has(t.slug)) bySlug.set(t.slug, t)
      }
    }
    return Array.from(bySlug.values()).sort((a, b) =>
      formatGhostTagName(a.name, a.slug).localeCompare(
        formatGhostTagName(b.name, b.slug),
        'pt-BR',
        { sensitivity: 'base' },
      ),
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
        const tags = (p.tags ?? []).map((t) => formatGhostTagName(t.name, t.slug).toLowerCase()).join(' ')
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

  const totalPages = meta?.pagination.pages ?? 1
  const totalPostsRemote = meta?.pagination.total ?? posts.length
  const siteUrl = environment.siteUrl.replace(/\/$/, '')

  const clearFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setActiveTagSlug(null)
  }

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
                  <Search size={20} />
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
                    {searchQuery || activeTagSlug ? (
                      <>
                        <strong>{visiblePosts.length}</strong>{' '}
                        {visiblePosts.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}
                      </>
                    ) : (
                      <>
                        <strong>{totalPostsRemote}</strong>{' '}
                        {totalPostsRemote === 1 ? 'artigo no blog' : 'artigos no blog'}
                      </>
                    )}
                  </span>
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
                      {formatGhostTagName(tag.name, tag.slug)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </section>

        <div className="blog-verge__inner blog-verge__list">
          {loading && (
            <div className="blog-modern-grid blog-modern-grid--page">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="blog-modern-skeleton" />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="blog-empty">
              <p>Não foi possível carregar os posts.</p>
              <button type="button" className="btn-editorial-green mt-3" onClick={() => loadPosts(1)}>
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="blog-empty">
              <p>Nenhum post publicado ainda. Volte em breve!</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && visiblePosts.length === 0 && (
            <div className="blog-empty">
              <p className="mb-2">Nenhum artigo corresponde à pesquisa ou ao filtro.</p>
              <button type="button" className="btn-editorial-green" onClick={clearFilters}>
                Mostrar tudo de novo
              </button>
            </div>
          )}

          {!loading && !error && visiblePosts.length > 0 && (
            <div className="blog-modern-grid blog-modern-grid--page">
              {visiblePosts.map((post, i) => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  featured={!searchQuery && !activeTagSlug && i === 0}
                />
              ))}
            </div>
          )}

          {!loading && !error && !searchQuery && !activeTagSlug && currentPage < totalPages && (
            <div className="load-more-bar">
              <button
                type="button"
                className="btn-load-more"
                disabled={loadingMore}
                onClick={() => loadPosts(currentPage + 1, true)}
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais artigos'}
              </button>
            </div>
          )}

          <JoinRedeCoopCta className="join-cta--page" />
        </div>
      </main>

      <Footer withMarginTop={false} />
    </>
  )
}
