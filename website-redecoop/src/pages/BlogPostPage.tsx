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
import { ghostService, rewriteGhostAssetUrl, rewriteGhostHtml, isGhostCaptionPlaceholder } from '@/services/ghost.service'
import { formatGhostTagName, publicTags } from '@/lib/blog'
import type { GhostPost } from '@/types'
import '@/styles/blog.css'
import '@/styles/ghost-content.css'

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
      keywords: post.tags?.map((t) => formatGhostTagName(t.name, t.slug)).join(', ') || undefined,
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

  const safeHtml = DOMPurify.sanitize(rewriteGhostHtml(post.html), {
    ADD_TAGS: ['iframe', 'figure', 'figcaption', 'video', 'audio', 'source', 'picture', 'track'],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'target',
      'rel',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'playsinline',
      'poster',
      'preload',
      'width',
      'height',
      'style',
      'loading',
      'decoding',
      'srcset',
      'sizes',
    ],
  })
  const postUrl = `${environment.siteUrl.replace(/\/$/, '')}/blog/${post.slug}`
  const shareImage = rewriteGhostAssetUrl(post.og_image || post.feature_image) || seoDefaults.image
  const publicPostTags = publicTags(post.tags)

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
          tags: publicPostTags.map((t) => formatGhostTagName(t.name, t.slug)),
          author: post.authors?.[0]?.name,
        }}
        jsonLd={buildPostJsonLd(post, postUrl, shareImage)}
      />

      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-gray-100">
        <div className="h-full bg-green transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Navbar />

      <article className="blog-article">
        <div className="blog-article__inner">
          <Link to="/blog" className="blog-article__back">
            <ArrowLeft size={16} /> Voltar ao blog
          </Link>

          {post.feature_image && (
            <figure className="blog-article__media">
              <img
                src={rewriteGhostAssetUrl(post.feature_image)}
                alt={post.feature_image_alt || post.title}
              />
              {post.feature_image_caption && !isGhostCaptionPlaceholder(post.feature_image_caption) && (
                <figcaption>{post.feature_image_caption}</figcaption>
              )}
            </figure>
          )}

          <h1 className="blog-article__title">{post.title}</h1>

          {post.custom_excerpt && (
            <p className="blog-article__lead">{post.custom_excerpt}</p>
          )}

          <div className="blog-article__meta">
            {post.authors?.[0] && <span>{post.authors[0].name}</span>}
            {post.authors?.[0] && <span aria-hidden="true">·</span>}
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            {post.reading_time ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="blog-article__read">
                  <Clock size={14} /> {post.reading_time} min
                </span>
              </>
            ) : null}
            {publicPostTags.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{publicPostTags.map((t) => formatGhostTagName(t.name, t.slug)).join(' · ')}</span>
              </>
            )}
          </div>

          <div
            className="blog-article__body"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <JoinRedeCoopCta />

          <div className="blog-article__share">
            <p>
              <Share2 size={16} /> Compartilhar
            </p>
            <div>
              <button type="button" onClick={() => share('whatsapp')}>WhatsApp</button>
              <button type="button" onClick={() => share('twitter')}>Twitter</button>
              <button type="button" onClick={() => share('copy')}>Copiar link</button>
            </div>
          </div>
        </div>
      </article>

      <Footer withMarginTop={false} />
    </>
  )
}
