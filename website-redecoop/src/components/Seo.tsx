import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { environment } from '@/config/environment'

const SITE_NAME = 'RedeCoop RS'
const DEFAULT_TITLE = 'RedeCoop RS — Agricultura familiar e cooperativas no RS'
const DEFAULT_DESCRIPTION =
  'RedeCoop RS conecta cooperativas da agricultura familiar e economia solidária no Rio Grande do Sul.'
const DEFAULT_IMAGE = '/assets/imgs/og-default.jpg'
const OG_IMAGE_WIDTH = '1200'
const OG_IMAGE_HEIGHT = '630'

export interface SeoProps {
  /** Título da aba/busca. O sufixo " | RedeCoop RS" é adicionado automaticamente. */
  title?: string
  description?: string
  /** Caminho canônico (ex.: "/blog"). Se omitido, usa a rota atual. */
  path?: string
  /** URL absoluta ou caminho local da imagem de compartilhamento. */
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  article?: {
    publishedTime?: string
    modifiedTime?: string
    tags?: string[]
    author?: string
  }
  /** Objetos Schema.org injetados como <script type="application/ld+json">. */
  jsonLd?: object[]
}

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  return `${environment.siteUrl.replace(/\/$/, '')}${pathOrUrl}`
}

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!content) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

const JSON_LD_ATTR = 'data-seo-jsonld'

function setJsonLd(blocks: object[]) {
  document.head.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((el) => el.remove())
  for (const block of blocks) {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(JSON_LD_ATTR, 'true')
    script.textContent = JSON.stringify(block)
    document.head.appendChild(script)
  }
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  article,
  jsonLd = [],
}: SeoProps) {
  const location = useLocation()

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
    const url = absoluteUrl(path ?? location.pathname)
    const imageUrl = absoluteUrl(image)

    document.title = fullTitle

    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setCanonical(url)

    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:locale', 'pt_BR')
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', imageUrl)
    setMeta('property', 'og:image:width', OG_IMAGE_WIDTH)
    setMeta('property', 'og:image:height', OG_IMAGE_HEIGHT)

    setMeta('property', 'article:published_time', article?.publishedTime)
    setMeta('property', 'article:modified_time', article?.modifiedTime)
    setMeta('property', 'article:author', article?.author)
    document.head.querySelectorAll('meta[property="article:tag"]').forEach((el) => el.remove())
    for (const tag of article?.tags ?? []) {
      const el = document.createElement('meta')
      el.setAttribute('property', 'article:tag')
      el.setAttribute('content', tag)
      document.head.appendChild(el)
    }

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', imageUrl)
    setMeta('name', 'twitter:site', '@redecooprs')

    setJsonLd(jsonLd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    path,
    image,
    type,
    noindex,
    location.pathname,
    article?.publishedTime,
    article?.modifiedTime,
    article?.author,
    JSON.stringify(article?.tags ?? []),
    JSON.stringify(jsonLd),
  ])

  return null
}

export const seoDefaults = {
  siteName: SITE_NAME,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  image: DEFAULT_IMAGE,
}
