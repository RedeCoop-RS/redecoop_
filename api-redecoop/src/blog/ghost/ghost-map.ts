import { sanitizeBlogHtml, readingStats } from './ghost-html';
import { BlogAuthor, BlogPost, BlogResource, BlogTag, BlogWriteInput } from './ghost.types';

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

function nullable(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function asStoredContent(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return null;
}

export function mapTag(raw: any): BlogTag {
  return {
    id: text(raw?.id),
    name: text(raw?.name),
    slug: text(raw?.slug),
    description: nullable(raw?.description),
    updatedAt: text(raw?.updated_at),
  };
}

export function mapAuthor(raw: any): BlogAuthor {
  return {
    id: text(raw?.id),
    name: text(raw?.name || raw?.slug),
    slug: text(raw?.slug),
    profileImage: nullable(raw?.profile_image),
  };
}

export function mapPost(raw: any, resource: BlogResource): BlogPost {
  const html = typeof raw?.html === 'string' ? raw.html : '';
  const plaintext = typeof raw?.plaintext === 'string' ? raw.plaintext : '';
  const stats = readingStats(plaintext || html);
  const readingTime = Number(raw?.reading_time);
  return {
    id: text(raw?.id),
    uuid: text(raw?.uuid),
    resource,
    title: text(raw?.title),
    slug: text(raw?.slug),
    html,
    plaintext,
    lexical: asStoredContent(raw?.lexical),
    mobiledoc: asStoredContent(raw?.mobiledoc),
    customExcerpt: text(raw?.custom_excerpt),
    excerpt: text(raw?.custom_excerpt || raw?.excerpt),
    featureImage: nullable(raw?.feature_image),
    featureImageAlt: nullable(raw?.feature_image_alt),
    featureImageCaption: nullable(raw?.feature_image_caption),
    featured: Boolean(raw?.featured),
    status: text(raw?.status || 'draft'),
    visibility: text(raw?.visibility || 'public'),
    publishedAt: nullable(raw?.published_at),
    createdAt: text(raw?.created_at),
    updatedAt: text(raw?.updated_at),
    url: nullable(raw?.url),
    metaTitle: nullable(raw?.meta_title),
    metaDescription: nullable(raw?.meta_description),
    ogImage: nullable(raw?.og_image),
    ogTitle: nullable(raw?.og_title),
    ogDescription: nullable(raw?.og_description),
    twitterImage: nullable(raw?.twitter_image),
    twitterTitle: nullable(raw?.twitter_title),
    twitterDescription: nullable(raw?.twitter_description),
    canonicalUrl: nullable(raw?.canonical_url),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(mapTag) : [],
    authors: Array.isArray(raw?.authors) ? raw.authors.map(mapAuthor) : [],
    readingTime: Number.isFinite(readingTime) ? readingTime : stats.readingTime,
    wordCount: stats.wordCount,
  };
}

function assign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined) target[key] = value;
}

/** Corpo no formato `{ posts: [...] }` / `{ pages: [...] }` da Admin API. */
export function toGhostDocument(input: BlogWriteInput): Record<string, unknown> {
  const post: Record<string, unknown> = {};
  assign(post, 'title', input.title);
  if (input.html !== undefined) post.html = sanitizeBlogHtml(input.html);
  if (input.lexical !== undefined) post.lexical = input.lexical;
  if (input.mobiledoc !== undefined) post.mobiledoc = input.mobiledoc;
  if (input.slug) post.slug = input.slug.trim();
  assign(post, 'custom_excerpt', input.customExcerpt);
  assign(post, 'status', input.status);
  assign(post, 'visibility', input.visibility);
  assign(post, 'featured', input.featured);
  assign(post, 'published_at', input.publishedAt);
  assign(post, 'feature_image', input.featureImage);
  assign(post, 'feature_image_alt', input.featureImageAlt);
  assign(post, 'feature_image_caption', input.featureImageCaption);
  assign(post, 'meta_title', input.metaTitle);
  assign(post, 'meta_description', input.metaDescription);
  assign(post, 'og_image', input.ogImage);
  assign(post, 'og_title', input.ogTitle);
  assign(post, 'og_description', input.ogDescription);
  assign(post, 'twitter_image', input.twitterImage);
  assign(post, 'twitter_title', input.twitterTitle);
  assign(post, 'twitter_description', input.twitterDescription);
  assign(post, 'canonical_url', input.canonicalUrl);
  assign(post, 'updated_at', input.updatedAt);
  if (input.tagIds) post.tags = input.tagIds.map((id) => ({ id }));
  if (input.authorIds) post.authors = input.authorIds.map((id) => ({ id }));
  return post;
}
