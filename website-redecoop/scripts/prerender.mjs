/**
 * Após o vite build, gera HTML estático por rota com meta/OG/canonical únicos.
 * Crawlers e WhatsApp leem o primeiro HTML — sem isso, tudo parece a home.
 *
 * Saídas:
 *   dist/index.html (home já no build — reescrito)
 *   dist/{rota}/index.html
 *   dist/blog/{slug}/index.html
 *   dist/404.html
 *   dist/cooperativas/index.html + dist/completar-cadastro/index.html (SPA noindex)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  staticRoutes,
  spaShellRoutes,
  fullTitle,
} from './seo-meta.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PUBLIC = join(__dirname, '..', 'public')

const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://redecooprs.com.br').replace(/\/$/, '')
const GHOST_URL = (process.env.VITE_GHOST_URL ?? 'https://redecooprs.com.br').replace(/\/$/, '')
const GHOST_KEY = process.env.VITE_GHOST_API_KEY ?? '0cd73f92f827f0cfa64be9919d'
const CONTACT_EMAIL = process.env.VITE_CONTACT_EMAIL ?? 'contato@redecooprs.com.br'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return `${SITE_URL}${DEFAULT_IMAGE}`
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

function setOrInsertMeta(html, attr, key, content) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i')
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`)
}

function removeMeta(html, attr, key) {
  const re = new RegExp(`\\s*<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, 'gi')
  return html.replace(re, '')
}

function applySeo(html, opts) {
  const {
    title = null,
    description = DEFAULT_DESCRIPTION,
    path = '/',
    image = DEFAULT_IMAGE,
    type = 'website',
    noindex = false,
    article = null,
    jsonLdExtra = [],
  } = opts

  const pageTitle = fullTitle(title)
  const url = `${SITE_URL}${path === '/' ? '/' : path}`
  const imageUrl = absoluteUrl(image)
  const robots = noindex ? 'noindex, nofollow' : 'index, follow'

  let out = html
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`)
  out = setOrInsertMeta(out, 'name', 'description', description)
  out = setOrInsertMeta(out, 'name', 'robots', robots)
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  )

  out = setOrInsertMeta(out, 'property', 'og:site_name', SITE_NAME)
  out = setOrInsertMeta(out, 'property', 'og:locale', 'pt_BR')
  out = setOrInsertMeta(out, 'property', 'og:type', type)
  out = setOrInsertMeta(out, 'property', 'og:title', pageTitle)
  out = setOrInsertMeta(out, 'property', 'og:description', description)
  out = setOrInsertMeta(out, 'property', 'og:url', url)
  out = setOrInsertMeta(out, 'property', 'og:image', imageUrl)
  out = setOrInsertMeta(out, 'property', 'og:image:width', OG_IMAGE_WIDTH)
  out = setOrInsertMeta(out, 'property', 'og:image:height', OG_IMAGE_HEIGHT)

  out = setOrInsertMeta(out, 'name', 'twitter:card', 'summary_large_image')
  out = setOrInsertMeta(out, 'name', 'twitter:title', pageTitle)
  out = setOrInsertMeta(out, 'name', 'twitter:description', description)
  out = setOrInsertMeta(out, 'name', 'twitter:image', imageUrl)
  out = setOrInsertMeta(out, 'name', 'twitter:site', '@redecooprs')

  // limpa article tags antigas do shell e reinsere se necessário
  out = removeMeta(out, 'property', 'article:published_time')
  out = removeMeta(out, 'property', 'article:modified_time')
  out = removeMeta(out, 'property', 'article:author')
  out = out.replace(/\s*<meta\s+property="article:tag"\s+content="[^"]*"\s*\/?>/gi, '')

  if (article) {
    if (article.publishedTime) {
      out = setOrInsertMeta(out, 'property', 'article:published_time', article.publishedTime)
    }
    if (article.modifiedTime) {
      out = setOrInsertMeta(out, 'property', 'article:modified_time', article.modifiedTime)
    }
    if (article.author) {
      out = setOrInsertMeta(out, 'property', 'article:author', article.author)
    }
    for (const tag of article.tags ?? []) {
      out = out.replace(
        /<\/head>/i,
        `    <meta property="article:tag" content="${escapeHtml(tag)}" />\n  </head>`,
      )
    }
  }

  // JSON-LD extras (além do Organization do index.html)
  out = out.replace(/\s*<script[^>]*data-seo-jsonld[^>]*>[\s\S]*?<\/script>/gi, '')
  for (const block of jsonLdExtra) {
    const json = JSON.stringify(block)
    out = out.replace(
      /<\/head>/i,
      `    <script type="application/ld+json" data-seo-jsonld="true">${json}</script>\n  </head>`,
    )
  }

  return out
}

function writeRouteHtml(path, html) {
  if (path === '/') {
    writeFileSync(join(DIST, 'index.html'), html)
    return
  }
  const dir = join(DIST, path.replace(/^\//, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

async function fetchPosts() {
  const posts = []
  let page = 1
  for (;;) {
    const params = new URLSearchParams({
      key: GHOST_KEY,
      limit: '100',
      page: String(page),
      include: 'tags,authors',
    })
    const res = await fetch(`${GHOST_URL}/ghost/api/content/posts/?${params}`, {
      headers: { 'Accept-Version': 'v6.0' },
    })
    if (!res.ok) throw new Error(`Ghost API ${res.status}`)
    const data = await res.json()
    posts.push(...(data.posts ?? []))
    const pagination = data.meta?.pagination
    if (!pagination?.next) break
    page = pagination.next
  }
  return posts
}

function ensureOgDefault() {
  const dest = join(PUBLIC, 'assets', 'imgs', 'og-default.jpg')
  const distDest = join(DIST, 'assets', 'imgs', 'og-default.jpg')
  const banner = join(PUBLIC, 'assets', 'imgs', 'bgs', 'banner-home.jpg')
  if (!existsSync(dest) && existsSync(banner)) {
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(banner, dest)
    console.log('[prerender] og-default.jpg criado a partir do banner (substitua por card 1200×630 quando possível)')
  }
  if (existsSync(dest)) {
    mkdirSync(dirname(distDest), { recursive: true })
    copyFileSync(dest, distDest)
  }
}

async function main() {
  const shellPath = join(DIST, 'index.html')
  if (!existsSync(shellPath)) {
    console.error('[prerender] dist/index.html não encontrado. Rode vite build antes.')
    process.exit(1)
  }

  ensureOgDefault()
  const shell = readFileSync(shellPath, 'utf8')

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    inLanguage: 'pt-BR',
  }

  const contactLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE_NAME,
    url: `${SITE_URL}/contato`,
    email: CONTACT_EMAIL,
    telephone: '+55-51-98131-0336',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rua Vítor Valpírio, 795 — Anchieta',
      addressLocality: 'Porto Alegre',
      addressRegion: 'RS',
      addressCountry: 'BR',
    },
    areaServed: { '@type': 'AdministrativeArea', name: 'Rio Grande do Sul' },
    sameAs: ['https://instagram.com/redecooprs', 'https://facebook.com/RedeCoop-RS'],
  }

  let count = 0
  for (const route of staticRoutes) {
    const jsonLdExtra = []
    if (route.path === '/') jsonLdExtra.push(websiteLd)
    if (route.path === '/contato') jsonLdExtra.push(contactLd)
    if (route.path === '/blog') {
      jsonLdExtra.push({
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `Blog ${SITE_NAME}`,
        url: `${SITE_URL}/blog`,
        description: route.description,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      })
    }

    const html = applySeo(shell, {
      title: route.title,
      description: route.description,
      path: route.path,
      image: route.image,
      jsonLdExtra,
    })
    writeRouteHtml(route.path, html)
    count++
  }

  for (const route of spaShellRoutes) {
    const html = applySeo(shell, {
      title: route.title,
      path: route.path,
      noindex: true,
    })
    writeRouteHtml(route.path, html)
    count++
  }

  const notFound = applySeo(shell, {
    title: 'Página não encontrada',
    description: 'A página que você procura não existe ou foi movida.',
    path: '/404',
    noindex: true,
  })
  writeFileSync(join(DIST, '404.html'), notFound)
  count++

  try {
    const posts = await fetchPosts()
    for (const post of posts) {
      const desc = (
        post.meta_description ||
        post.custom_excerpt ||
        post.excerpt ||
        DEFAULT_DESCRIPTION
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160)
      const image = post.og_image || post.feature_image || DEFAULT_IMAGE
      const path = `/blog/${post.slug}`
      const html = applySeo(shell, {
        title: post.title,
        description: desc || DEFAULT_DESCRIPTION,
        path,
        image,
        type: 'article',
        article: {
          publishedTime: post.published_at,
          modifiedTime: post.updated_at,
          author: post.authors?.[0]?.name,
          tags: (post.tags ?? []).map((t) => t.name).filter(Boolean),
        },
        jsonLdExtra: [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: desc,
            image: absoluteUrl(image),
            datePublished: post.published_at,
            dateModified: post.updated_at,
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${path}` },
            author: post.authors?.[0]
              ? { '@type': 'Person', name: post.authors[0].name }
              : { '@type': 'Organization', name: SITE_NAME },
            publisher: {
              '@type': 'Organization',
              name: SITE_NAME,
              logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/assets/imgs/logo.png`,
              },
            },
          },
        ],
      })
      writeRouteHtml(path, html)
      count++
    }
    console.log(`[prerender] ${posts.length} post(s) do blog`)
  } catch (err) {
    console.warn(`[prerender] Aviso: posts Ghost não gerados (${err.message})`)
  }

  console.log(`[prerender] ${count} HTML(s) gerados em ${DIST}`)
}

main().catch((err) => {
  console.error('[prerender]', err)
  process.exit(1)
})
