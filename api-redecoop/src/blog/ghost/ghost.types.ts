export type BlogResource = 'post' | 'page';

export type BlogVisibility = 'public' | 'members' | 'paid';

export interface GhostConfig {
  url: string;
  key: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  slug: string;
  profileImage: string | null;
}

export interface BlogPost {
  id: string;
  uuid: string;
  resource: BlogResource;
  title: string;
  slug: string;
  html: string;
  plaintext: string;
  excerpt: string;
  customExcerpt: string;
  featureImage: string | null;
  featureImageAlt: string | null;
  featureImageCaption: string | null;
  featured: boolean;
  status: string;
  visibility: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  url: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  twitterImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  canonicalUrl: string | null;
  tags: BlogTag[];
  authors: BlogAuthor[];
  readingTime: number;
  wordCount: number;
}

export interface BlogList {
  items: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    pages: number;
    total: number;
    next: number | null;
    prev: number | null;
  };
}

export interface GhostSiteInfo {
  title: string;
  description: string;
  url: string;
  version: string;
  logo: string | null;
}

export interface BlogWriteInput {
  title?: string;
  html?: string;
  slug?: string | null;
  customExcerpt?: string | null;
  status?: 'draft' | 'published' | 'scheduled';
  visibility?: BlogVisibility;
  featured?: boolean;
  publishedAt?: string | null;
  featureImage?: string | null;
  featureImageAlt?: string | null;
  featureImageCaption?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterImage?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  canonicalUrl?: string | null;
  tagIds?: string[];
  authorIds?: string[];
  updatedAt?: string;
}

export interface BlogListQuery {
  page?: number;
  limit?: number;
  status?: string;
  tag?: string;
  author?: string;
  search?: string;
  order?: string;
}

export interface GhostHttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
}

export interface GhostHttpResult {
  status: number;
  data: unknown;
}

export type GhostTransport = (request: GhostHttpRequest) => Promise<GhostHttpResult>;
