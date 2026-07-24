import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { ArrowLeft, Clock, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Seo, seoDefaults } from '@/components/Seo'
import { JoinRedeCoopCta } from '@/components/JoinRedeCoopCta'
import { environment } from '@/config/environment'
import { ghostService, rewriteGhostAssetUrl, rewriteGhostHtml } from '@/services/ghost.service'
import type { GhostPost } from '@/types'
import '@/styles/blog.css'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function postDescription(post: GhostPost): string {
  const text = post.meta_description || post.custom_excerpt || post.excerpt || stripHtml(post.html)
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
}

function buildPostJsonLd(post: GhostPost, url: string, image: string): object[] {
  const author = post.authors?.[0]
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: postDescription(post),
      image: image ? [image] : undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: author
        ? { '@type': 'Person', name: author.name }
        : { '@type': 'Organization', name: seoDefaults.siteName },
      publisher: {
        '@type': 'Organization',
        name: seoDefaults.siteName,
        logo: {
          '@type': 'ImageObject',
          url: `${environment.siteUrl.replace(/\/$/, '')}/assets/imgs/logo.png`,
        },
      },
      keywords: post.tags?.map((t) => t.name).join(', ') || undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Blog',
          item: `${environment.siteUrl.replace(/\/$/, '')}/blog`,
        },
        { '@type': 'ListItem', position: 2, name: post.title, item: url },
      ],
    },
  ]
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<GhostPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!slug) return
    ghostService
      .getPostBySlug(slug)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const scrolled = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100
      setProgress(Math.min(100, scrolled))
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const share = (platform: 'whatsapp' | 'twitter' | 'copy') => {
    const url = window.location.href
    const text = post?.title ?? ''
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank')
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  if (loading) {
    return (
      <>
        <Seo title="Carregando artigo…" noindex path={slug ? `/blog/${slug}` : '/blog'} />
        <Navbar />
        <div className="py-32 text-center text-grey">Carregando artigo...</div>
        <Footer withMarginTop={false} />
      </>
    )
  }

  if (!post) {
    return (
      <>
        <Seo title="Artigo não encontrado" noindex path={slug ? `/blog/${slug}` : '/blog'} />
        <Navbar />
        <div className="py-32 text-center">
          <h1 className="text-2xl font-bold">Artigo não encontrado</h1>
          <Link to="/blog" className="text-green mt-4 inline-block">Voltar ao blog</Link>
        </div>
        <Footer withMarginTop={false} />
      </>
    )
  }

  const safeHtml = DOMPurify.sanitize(rewriteGhostHtml(post.html))
  const postUrl = `${environment.siteUrl.replace(/\/$/, '')}/blog/${post.slug}`
  const shareImage = rewriteGhostAssetUrl(post.og_image || post.feature_image) || seoDefaults.image

  return (
    <>
      <Seo
        title={post.meta_title || post.title}
        description={postDescription(post)}
        path={`/blog/${post.slug}`}
        image={shareImage}
        type="article"
        article={{
          publishedTime: post.published_at,
          modifiedTime: post.updated_at,
          tags: post.tags?.map((t) => t.name),
          author: post.authors?.[0]?.name,
        }}
        jsonLd={buildPostJsonLd(post, postUrl, shareImage)}
      />

      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-gray-100">
        <div className="h-full bg-green transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Navbar />

      {post.feature_image && (
        <div className="h-64 md:h-96 overflow-hidden">
          <img
            src={rewriteGhostAssetUrl(post.feature_image)}
            alt={post.feature_image_alt || post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <article className="py-12 px-4 bg-section-paper">
        <div className="mx-auto max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-green hover:gap-3 transition-all mb-8">
            <ArrowLeft size={16} /> Voltar ao blog
          </Link>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((t) => (
                <span key={t.id} className="rounded-full bg-green/10 text-green text-xs font-semibold px-3 py-1">
                  {t.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-ink leading-tight">
            {post.title}
          </h1>

          {post.custom_excerpt && (
            <p className="mt-4 text-lg text-grey-dark leading-relaxed">{post.custom_excerpt}</p>
          )}

          <div className="flex items-center gap-4 mt-8 pb-8 border-b border-gray-100 text-sm text-grey">
            {post.authors?.[0] && (
              <div className="flex items-center gap-2">
                {post.authors[0].profile_image && (
                  <img
                    src={rewriteGhostAssetUrl(post.authors[0].profile_image)}
                    alt={post.authors[0].name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="font-medium text-ink">{post.authors[0].name}</span>
              </div>
            )}
            <span>{formatDate(post.published_at)}</span>
            {post.reading_time && (
              <span className="flex items-center gap-1">
                <Clock size={14} /> {post.reading_time} min
              </span>
            )}
          </div>

          <div
            className="prose prose-lg max-w-none mt-8 prose-headings:text-ink prose-a:text-green prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <JoinRedeCoopCta />

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="flex items-center gap-2 text-sm font-semibold text-grey-dark mb-4">
              <Share2 size={16} /> Compartilhar
            </p>
            <div className="flex gap-3">
              <button onClick={() => share('whatsapp')} className="rounded-full bg-green/10 text-green px-4 py-2 text-sm font-medium hover:bg-green/20">
                WhatsApp
              </button>
              <button onClick={() => share('twitter')} className="rounded-full bg-green/10 text-green px-4 py-2 text-sm font-medium hover:bg-green/20">
                Twitter
              </button>
              <button onClick={() => share('copy')} className="rounded-full bg-green/10 text-green px-4 py-2 text-sm font-medium hover:bg-green/20">
                Copiar link
              </button>
            </div>
          </div>
        </div>
      </article>

      <Footer withMarginTop={false} />
    </>
  )
}
