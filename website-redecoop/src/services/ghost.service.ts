import { environment } from '@/config/environment'
import type { GhostPost } from '@/types'

interface GhostResponse {
  posts: GhostPost[]
  meta?: { pagination: { page: number; limit: number; pages: number; total: number } }
}

async function ghostFetch<T>(path: string): Promise<T> {
  const url = `${environment.ghostUrl}/ghost/api/content${path}`
  const response = await fetch(url, {
    headers: { 'Accept-Version': 'v6.0' },
  })
  if (!response.ok) throw new Error(`Ghost API error: ${response.status}`)
  return response.json() as Promise<T>
}

export function rewriteGhostAssetUrl(url?: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${environment.ghostUrl}${url}`
  return url
}

export function rewriteGhostHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/(src|href)="\/content\//g, `$1="${environment.ghostUrl}/content/`)
    .replace(/(src|href)="\/media\//g, `$1="${environment.ghostUrl}/media/`)
}

export function isGhostCaptionPlaceholder(caption?: string) {
  if (!caption) return true
  return /add a caption/i.test(caption.trim())
}

export const ghostService = {
  async getPosts(limit = 50, page = 1): Promise<GhostResponse> {
    const params = new URLSearchParams({
      key: environment.ghostApiKey,
      limit: String(limit),
      page: String(page),
      include: 'tags,authors',
    })
    return ghostFetch(`/posts/?${params}`)
  },

  async getRecentPosts(limit = 3): Promise<GhostPost[]> {
    const { posts } = await this.getPosts(limit, 1)
    return posts
  },

  async getPostBySlug(slug: string): Promise<GhostPost | null> {
    const params = new URLSearchParams({
      key: environment.ghostApiKey,
      include: 'tags,authors',
    })
    try {
      const data = await ghostFetch<{ posts: GhostPost[] }>(
        `/posts/slug/${slug}/?${params}`,
      )
      return data.posts[0] ?? null
    } catch {
      return null
    }
  },
}
