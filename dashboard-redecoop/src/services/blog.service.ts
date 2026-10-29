import { ApiError, apiFetchData } from '@/lib/api'

export type BlogResource = 'post' | 'page'
export type BlogVisibility = 'public' | 'members' | 'paid'

export interface GhostSiteInfo {
  title: string
  description: string
  url: string
  version: string
  logo: string | null
}

export interface BlogConnection {
  configured: boolean
  source: 'saved' | 'env' | 'mixed' | 'none'
  adminUrl: string | null
  hasApiKey: boolean
  keyHint: string | null
  usingEnvUrl: boolean
  usingEnvKey: boolean
  saved: boolean
  connected: boolean
  site: GhostSiteInfo | null
  error: string | null
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  description: string | null
  updatedAt: string
}

export interface BlogAuthor {
  id: string
  name: string
  slug: string
  profileImage: string | null
}

export interface BlogPost {
  id: string
  uuid: string
  resource: BlogResource
  title: string
  slug: string
  html: string
  plaintext: string
  excerpt: string
  customExcerpt: string
  featureImage: string | null
  featureImageAlt: string | null
  featureImageCaption: string | null
  featured: boolean
  status: string
  visibility: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  url: string | null
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  ogTitle: string | null
  ogDescription: string | null
  twitterImage: string | null
  twitterTitle: string | null
  twitterDescription: string | null
  canonicalUrl: string | null
  tags: BlogTag[]
  authors: BlogAuthor[]
  readingTime: number
  wordCount: number
}

export interface BlogList {
  items: BlogPost[]
  pagination: { page: number; limit: number; pages: number; total: number; next: number | null; prev: number | null }
}

export interface BlogWrite {
  resource: BlogResource
  title?: string
  html?: string
  slug?: string
  customExcerpt?: string
  status?: 'draft' | 'published' | 'scheduled'
  visibility?: BlogVisibility
  featured?: boolean
  publishedAt?: string
  featureImage?: string | null
  featureImageAlt?: string | null
  featureImageCaption?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  ogImage?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  twitterImage?: string | null
  twitterTitle?: string | null
  twitterDescription?: string | null
  canonicalUrl?: string | null
  tagIds?: string[]
  authorIds?: string[]
  updatedAt?: string
}

export interface BlogDraft extends BlogWrite {
  localKey: string
  id: string | null
  title: string
  html: string
  slug: string
  customExcerpt: string
  status: 'draft' | 'published' | 'scheduled'
  visibility: BlogVisibility
  featured: boolean
  publishedAt: string
  featureImage: string
  featureImageAlt: string
  featureImageCaption: string
  metaTitle: string
  metaDescription: string
  ogImage: string
  ogTitle: string
  ogDescription: string
  twitterImage: string
  twitterTitle: string
  twitterDescription: string
  canonicalUrl: string
  tagIds: string[]
  authorIds: string[]
  updatedAt: string
  url: string | null
  wordCount: number
  readingTime: number
  dirty: boolean
  htmlDirty: boolean
  conflict: boolean
}

export function emptyDraft(resource: BlogResource, authorId?: string): BlogDraft {
  return {
    localKey: `novo-${Date.now()}`,
    id: null,
    resource,
    title: '',
    html: '<p></p>',
    slug: '',
    customExcerpt: '',
    status: 'draft',
    visibility: 'public',
    featured: false,
    publishedAt: '',
    featureImage: '',
    featureImageAlt: '',
    featureImageCaption: '',
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
    ogTitle: '',
    ogDescription: '',
    twitterImage: '',
    twitterTitle: '',
    twitterDescription: '',
    canonicalUrl: '',
    tagIds: [],
    authorIds: authorId ? [authorId] : [],
    updatedAt: '',
    url: null,
    wordCount: 0,
    readingTime: 0,
    dirty: false,
    htmlDirty: false,
    conflict: false,
  }
}

export function draftFromPost(post: BlogPost): BlogDraft {
  const status = post.status === 'published' || post.status === 'scheduled' ? post.status : 'draft'
  return {
    localKey: post.id,
    id: post.id,
    resource: post.resource,
    title: post.title,
    html: post.html || '<p></p>',
    slug: post.slug,
    customExcerpt: post.customExcerpt || '',
    status,
    visibility: (post.visibility === 'members' || post.visibility === 'paid' ? post.visibility : 'public'),
    featured: post.featured,
    publishedAt: post.publishedAt || '',
    featureImage: post.featureImage || '',
    featureImageAlt: post.featureImageAlt || '',
    featureImageCaption: post.featureImageCaption || '',
    metaTitle: post.metaTitle || '',
    metaDescription: post.metaDescription || '',
    ogImage: post.ogImage || '',
    ogTitle: post.ogTitle || '',
    ogDescription: post.ogDescription || '',
    twitterImage: post.twitterImage || '',
    twitterTitle: post.twitterTitle || '',
    twitterDescription: post.twitterDescription || '',
    canonicalUrl: post.canonicalUrl || '',
    tagIds: post.tags.map((tag) => tag.id),
    authorIds: post.authors.map((author) => author.id),
    updatedAt: post.updatedAt,
    url: post.url,
    wordCount: post.wordCount,
    readingTime: post.readingTime,
    dirty: false,
    htmlDirty: false,
    conflict: false,
  }
}

export function toWrite(draft: BlogDraft): BlogWrite {
  return {
    resource: draft.resource,
    title: draft.title.trim(),
    ...(draft.htmlDirty ? { html: draft.html } : {}),
    slug: draft.slug.trim() || undefined,
    customExcerpt: draft.customExcerpt,
    status: draft.status,
    visibility: draft.visibility,
    featured: draft.featured,
    featureImage: draft.featureImage.trim() || null,
    featureImageAlt: draft.featureImageAlt.trim() || null,
    featureImageCaption: draft.featureImageCaption.trim() || null,
    metaTitle: draft.metaTitle.trim() || null,
    metaDescription: draft.metaDescription.trim() || null,
    ogImage: draft.ogImage.trim() || null,
    ogTitle: draft.ogTitle.trim() || null,
    ogDescription: draft.ogDescription.trim() || null,
    twitterImage: draft.twitterImage.trim() || null,
    twitterTitle: draft.twitterTitle.trim() || null,
    twitterDescription: draft.twitterDescription.trim() || null,
    canonicalUrl: draft.canonicalUrl.trim() || null,
    tagIds: draft.tagIds,
    authorIds: draft.authorIds.length ? draft.authorIds : undefined,
    updatedAt: draft.updatedAt || undefined,
  }
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const blogService = {
  connection() {
    return apiFetchData<BlogConnection>('/root/blog/connection')
  },
  saveConnection(body: { adminUrl: string; apiKey?: string; clearKey?: boolean }) {
    return apiFetchData<BlogConnection>('/root/blog/connection', { method: 'PUT', body: JSON.stringify(body) })
  },
  deleteConnection() {
    return apiFetchData<BlogConnection>('/root/blog/connection', { method: 'DELETE' })
  },
  testConnection(body: { adminUrl: string; apiKey?: string }) {
    return apiFetchData<{ ok: true; site: GhostSiteInfo }>('/root/blog/connection/test', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  list(params: { resource: BlogResource; page?: number; limit?: number; status?: string; tag?: string; author?: string; search?: string; order?: string }) {
    return apiFetchData<BlogList>(`/root/blog/posts${query(params)}`)
  },
  read(id: string, resource: BlogResource) {
    return apiFetchData<BlogPost>(`/root/blog/posts/${id}${query({ resource })}`)
  },
  create(body: BlogWrite) {
    return apiFetchData<BlogPost>('/root/blog/posts', { method: 'POST', body: JSON.stringify(body) })
  },
  update(id: string, body: BlogWrite) {
    return apiFetchData<BlogPost>(`/root/blog/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  },
  remove(id: string, resource: BlogResource) {
    return apiFetchData<{ ok: true }>(`/root/blog/posts/${id}${query({ resource })}`, { method: 'DELETE' })
  },
  publish(id: string, body: { resource: BlogResource; updatedAt: string; publishedAt?: string }) {
    return apiFetchData<BlogPost>(`/root/blog/posts/${id}/publish`, { method: 'POST', body: JSON.stringify(body) })
  },
  unpublish(id: string, body: { resource: BlogResource; updatedAt: string }) {
    return apiFetchData<BlogPost>(`/root/blog/posts/${id}/unpublish`, { method: 'POST', body: JSON.stringify(body) })
  },
  schedule(id: string, body: { resource: BlogResource; updatedAt: string; publishedAt: string }) {
    return apiFetchData<BlogPost>(`/root/blog/posts/${id}/schedule`, { method: 'POST', body: JSON.stringify(body) })
  },
  duplicate(id: string, resource: BlogResource) {
    return apiFetchData<BlogPost>(`/root/blog/posts/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ resource }),
    })
  },
  bulk(body: { action: 'publish' | 'unpublish' | 'delete' | 'feature' | 'unfeature'; items: Array<{ id: string; resource: BlogResource; updatedAt: string }> }) {
    return apiFetchData<{ ok: string[]; failed: Array<{ id: string; message: string }> }>('/root/blog/posts/bulk', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  tags() {
    return apiFetchData<BlogTag[]>('/root/blog/tags')
  },
  createTag(body: { name: string; description?: string }) {
    return apiFetchData<BlogTag>('/root/blog/tags', { method: 'POST', body: JSON.stringify(body) })
  },
  updateTag(id: string, body: { name: string; description?: string; updatedAt: string }) {
    return apiFetchData<BlogTag>(`/root/blog/tags/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  },
  deleteTag(id: string) {
    return apiFetchData<{ ok: true }>(`/root/blog/tags/${id}`, { method: 'DELETE' })
  },
  authors() {
    return apiFetchData<BlogAuthor[]>('/root/blog/authors')
  },
  upload(file: File) {
    const body = new FormData()
    body.append('file', file)
    return apiFetchData<{ url: string; ref: string | null }>('/root/blog/images', { method: 'POST', body })
  },
}

export function blogErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a ação.'
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  scheduled: 'Agendado',
  sent: 'Enviado',
}

export const VISIBILITY_LABEL: Record<BlogVisibility, string> = {
  public: 'Público',
  members: 'Membros',
  paid: 'Pagantes',
}
