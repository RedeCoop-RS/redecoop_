import type { GhostPost, GhostTag } from '@/types'

const TAG_LABELS: Record<string, string> = {
  agriculturafamiliar: 'Agricultura familiar',
  agriculturfamiliar: 'Agricultura familiar',
  cooperativismo: 'Cooperativismo',
  intercooperacao: 'Intercooperação',
  intercooperação: 'Intercooperação',
  redecooprs: 'RedeCoop RS',
  redecoop: 'RedeCoop',
  noticia: 'Notícia',
  noticias: 'Notícia',
}

function tagKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function isPublicTag(tag: GhostTag) {
  const slug = tag.slug?.toLowerCase() ?? ''
  const name = tag.name?.trim() ?? ''
  if (slug.startsWith('hash-') || name.startsWith('hash-') || name === 'internal') return false
  return Boolean(name)
}

export function publicTags(tags?: GhostTag[]) {
  return (tags ?? []).filter(isPublicTag)
}

export function formatGhostTagName(name: string, slug?: string) {
  const mapped = TAG_LABELS[tagKey(slug || name)] || TAG_LABELS[tagKey(name)]
  if (mapped) return mapped

  if (slug?.includes('-')) {
    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  if (/\s/.test(name)) return name

  const camel = name.replace(/([a-zà-ú])([A-ZÁ-Ú])/g, '$1 $2')
  if (camel !== name) return camel

  return name
}

export function clipExcerpt(text?: string, max = 150) {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  if (clean.length <= max) return clean
  const sliced = clean.slice(0, max)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > 48 ? sliced.slice(0, lastSpace) : sliced
  return `${cut.replace(/[.,;:\s]+$/, '')}…`
}

export function formatBlogDate(date: string) {
  return new Date(date)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    .toUpperCase()
}

export function postExcerpt(post: GhostPost, max = 150) {
  return clipExcerpt(post.custom_excerpt || post.excerpt, max)
}
