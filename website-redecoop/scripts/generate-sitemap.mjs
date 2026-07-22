/**
 * Gera dist/sitemap.xml após o build / prerender.
 * Rotas estáticas (seo-meta) + posts do Ghost.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { staticRoutes } from './seo-meta.mjs'

const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://redecooprs.com.br').replace(/\/$/, '')
const GHOST_URL = (process.env.VITE_GHOST_URL ?? 'https://redecooprs.com.br').replace(/\/$/, '')
const GHOST_KEY = process.env.VITE_GHOST_API_KEY ?? '0cd73f92f827f0cfa64be9919d'

async function fetchPosts() {
  const posts = []
  let page = 1
  for (;;) {
    const params = new URLSearchParams({
      key: GHOST_KEY,
      limit: '100',
      page: String(page),
      fields: 'slug,updated_at,published_at',
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

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')
}

async function main() {
  let posts = []
  try {
    posts = await fetchPosts()
    console.log(`[sitemap] ${posts.length} post(s) do Ghost incluídos`)
  } catch (err) {
    console.warn(`[sitemap] Aviso: falha ao buscar posts do Ghost (${err.message}); gerando só rotas estáticas`)
  }

  const entries = [
    ...staticRoutes.map((r) =>
      urlEntry({
        loc: `${SITE_URL}${r.path === '/' ? '/' : r.path}`,
        changefreq: r.changefreq,
        priority: r.priority,
      }),
    ),
    ...posts.map((p) =>
      urlEntry({
        loc: `${SITE_URL}/blog/${p.slug}`,
        lastmod: p.updated_at ?? p.published_at,
        changefreq: 'monthly',
        priority: '0.8',
      }),
    ),
  ]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')

  const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  mkdirSync(distDir, { recursive: true })
  const outPath = join(distDir, 'sitemap.xml')
  writeFileSync(outPath, xml)
  console.log(`[sitemap] Gerado: ${outPath} (${entries.length} URLs)`)
}

main()
