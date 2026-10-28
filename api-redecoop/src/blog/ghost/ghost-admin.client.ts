import { GhostApiError } from './ghost-api.error';
import { createGhostAdminJwt } from './ghost-jwt';
import { mapAuthor, mapPost, mapTag, toGhostDocument } from './ghost-map';
import { buildGhostFilter, ghostOrder } from './ghost-query';
import {
  BlogAuthor,
  BlogList,
  BlogListQuery,
  BlogPost,
  BlogResource,
  BlogTag,
  BlogWriteInput,
  GhostConfig,
  GhostHttpResult,
  GhostSiteInfo,
  GhostTransport,
} from './ghost.types';

const PLURAL: Record<BlogResource, 'posts' | 'pages'> = { post: 'posts', page: 'pages' };

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export function ghostApiVersion(): string {
  return process.env.GHOST_API_VERSION?.trim() || 'v6.0';
}

function timeoutMs(): number {
  const parsed = Number(process.env.GHOST_TIMEOUT_MS || 20000);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : 20000;
}

function ghostMessage(data: any, status: number): { message: string; type?: string } {
  const error = Array.isArray(data?.errors) ? data.errors[0] : null;
  const type = error?.type || error?.errorType;
  const raw = error?.context || error?.message;
  if (status === 409 || type === 'UpdateCollisionError') {
    return {
      type: 'UpdateCollisionError',
      message: 'Este conteúdo foi alterado em outro lugar. Recarregue antes de salvar de novo.',
    };
  }
  if (typeof raw === 'string' && raw.trim()) return { type, message: raw.trim() };
  if (status === 401 || status === 403) return { type, message: 'O Ghost recusou a autenticação.' };
  if (status === 404) return { type, message: 'Conteúdo não encontrado no Ghost.' };
  return { type, message: `O Ghost respondeu com erro ${status}.` };
}

export async function fetchGhostTransport(request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
}): Promise<GhostHttpResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);
  try {
    const body =
      request.body instanceof FormData
        ? request.body
        : request.body === undefined
          ? undefined
          : JSON.stringify(request.body);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body,
      signal: controller.signal,
      redirect: 'follow',
    });
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { errors: [{ message: text.slice(0, 300) }] };
      }
    }
    return { status: response.status, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GhostApiError('O Ghost demorou demais para responder.', 504);
    }
    throw new GhostApiError(
      'Não foi possível falar com o Ghost. Confira a URL e se o site está no ar.',
      503,
    );
  } finally {
    clearTimeout(timer);
  }
}

function absoluteUrl(origin: string, value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${origin}${value}`;
  return value;
}

export class GhostAdminClient {
  private cached: { apiKey: string; token: string; exp: number } | null = null;

  constructor(private readonly transport: GhostTransport = fetchGhostTransport) {}

  private token(apiKey: string): string {
    const now = Math.floor(Date.now() / 1000);
    if (this.cached && this.cached.apiKey === apiKey && this.cached.exp - 30 > now) {
      return this.cached.token;
    }
    const token = createGhostAdminJwt(apiKey, now);
    this.cached = { apiKey, token, exp: now + 3 * 60 };
    return token;
  }

  private async call<T>(
    cfg: GhostConfig,
    method: string,
    path: string,
    options?: { query?: Record<string, string | undefined>; body?: unknown; form?: FormData },
  ): Promise<T> {
    const origin = cfg.url.replace(/\/+$/, '');
    const url = new URL(`${origin}/ghost/api/admin/${path.replace(/^\/+/, '')}`);
    for (const [key, value] of Object.entries(options?.query || {})) {
      if (value) url.searchParams.set(key, value);
    }
    const headers: Record<string, string> = {
      Authorization: `Ghost ${this.token(cfg.key)}`,
      'Accept-Version': ghostApiVersion(),
      Accept: 'application/json',
    };
    let body: unknown;
    if (options?.form) body = options.form;
    else if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = options.body;
    }
    const result = await this.transport({
      url: url.toString(),
      method,
      headers,
      body,
      timeoutMs: timeoutMs(),
    });
    if (result.status >= 400) {
      const parsed = ghostMessage(result.data, result.status);
      throw new GhostApiError(parsed.message, result.status, parsed.type);
    }
    return result.data as T;
  }

  private collection(resource: BlogResource): 'posts' | 'pages' {
    return PLURAL[resource];
  }

  private one(data: any, resource: BlogResource): BlogPost {
    const raw = (data?.[this.collection(resource)] || [])[0];
    if (!raw?.id || !raw?.updated_at) {
      throw new GhostApiError('Resposta inesperada do Ghost.', 502);
    }
    return mapPost(raw, resource);
  }

  async site(cfg: GhostConfig): Promise<GhostSiteInfo> {
    const data = await this.call<any>(cfg, 'GET', 'site/');
    const site = data?.site || {};
    return {
      title: site.title || '',
      description: site.description || '',
      url: site.url || cfg.url,
      version: site.version ? String(site.version) : '',
      logo: absoluteUrl(cfg.url.replace(/\/+$/, ''), site.logo || null),
    };
  }

  async browse(cfg: GhostConfig, resource: BlogResource, query: BlogListQuery): Promise<BlogList> {
    const filter = buildGhostFilter(query);
    const data = await this.call<any>(cfg, 'GET', `${this.collection(resource)}/`, {
      query: {
        limit: String(query.limit || 15),
        page: String(query.page || 1),
        order: ghostOrder(query.order),
        include: 'tags,authors',
        filter: filter || undefined,
      },
    });
    const pagination = data?.meta?.pagination || {};
    return {
      items: (data?.[this.collection(resource)] || []).map((item: any) => mapPost(item, resource)),
      pagination: {
        page: Number(pagination.page || query.page || 1),
        limit: Number(pagination.limit || query.limit || 15),
        pages: Number(pagination.pages || 1),
        total: Number(pagination.total || 0),
        next: pagination.next ?? null,
        prev: pagination.prev ?? null,
      },
    };
  }

  async read(cfg: GhostConfig, resource: BlogResource, id: string): Promise<BlogPost> {
    const data = await this.call<any>(cfg, 'GET', `${this.collection(resource)}/${id}/`, {
      query: { formats: 'html,plaintext,lexical', include: 'tags,authors' },
    });
    return this.one(data, resource);
  }

  async create(cfg: GhostConfig, resource: BlogResource, input: BlogWriteInput): Promise<BlogPost> {
    const name = this.collection(resource);
    const data = await this.call<any>(cfg, 'POST', `${name}/`, {
      query: { source: input.html !== undefined ? 'html' : undefined },
      body: { [name]: [toGhostDocument(input)] },
    });
    return this.one(data, resource);
  }

  async update(cfg: GhostConfig, resource: BlogResource, id: string, input: BlogWriteInput): Promise<BlogPost> {
    const name = this.collection(resource);
    const data = await this.call<any>(cfg, 'PUT', `${name}/${id}/`, {
      query: { source: input.html !== undefined ? 'html' : undefined },
      body: { [name]: [toGhostDocument(input)] },
    });
    return this.one(data, resource);
  }

  async remove(cfg: GhostConfig, resource: BlogResource, id: string): Promise<{ ok: true }> {
    await this.call(cfg, 'DELETE', `${this.collection(resource)}/${id}/`);
    return { ok: true };
  }

  async copy(cfg: GhostConfig, resource: BlogResource, id: string): Promise<BlogPost> {
    const name = this.collection(resource);
    const data = await this.call<any>(cfg, 'POST', `${name}/${id}/copy/`, { body: {} });
    return this.one(data, resource);
  }

  async tags(cfg: GhostConfig): Promise<BlogTag[]> {
    return this.collect(cfg, 'tags/', 'tags', mapTag);
  }

  async createTag(
    cfg: GhostConfig,
    input: { name: string; slug?: string; description?: string | null },
  ): Promise<BlogTag> {
    const data = await this.call<any>(cfg, 'POST', 'tags/', {
      body: {
        tags: [{ name: input.name, slug: input.slug || undefined, description: input.description ?? null }],
      },
    });
    const tag = data?.tags?.[0];
    if (!tag?.id) throw new GhostApiError('O Ghost não devolveu a tag criada.', 502);
    return mapTag(tag);
  }

  async updateTag(
    cfg: GhostConfig,
    id: string,
    input: { name?: string; slug?: string; description?: string | null; updatedAt: string },
  ): Promise<BlogTag> {
    const data = await this.call<any>(cfg, 'PUT', `tags/${id}/`, {
      body: {
        tags: [
          {
            name: input.name,
            slug: input.slug || undefined,
            description: input.description,
            updated_at: input.updatedAt,
          },
        ],
      },
    });
    const tag = data?.tags?.[0];
    if (!tag?.id) throw new GhostApiError('O Ghost não devolveu a tag atualizada.', 502);
    return mapTag(tag);
  }

  async deleteTag(cfg: GhostConfig, id: string): Promise<{ ok: true }> {
    await this.call(cfg, 'DELETE', `tags/${id}/`);
    return { ok: true };
  }

  async users(cfg: GhostConfig): Promise<BlogAuthor[]> {
    return this.collect(cfg, 'users/', 'users', mapAuthor, { include: 'roles' });
  }

  /** Ghost 6 removeu `limit=all` (teto 100). Pagina até esgotar. */
  private async collect<T>(
    cfg: GhostConfig,
    path: string,
    key: string,
    map: (raw: any) => T,
    extra?: Record<string, string | undefined>,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (page <= MAX_PAGES) {
      const data = await this.call<any>(cfg, 'GET', path, {
        query: { limit: String(PAGE_SIZE), page: String(page), ...extra },
      });
      const batch = Array.isArray(data?.[key]) ? data[key].map(map) : [];
      items.push(...batch);
      const next = Number(data?.meta?.pagination?.next);
      if (!batch.length || !Number.isFinite(next) || next <= page) break;
      page = next;
    }
    return items;
  }

  async uploadImage(
    cfg: GhostConfig,
    file: { buffer: Buffer; mimetype: string; filename: string },
  ): Promise<{ url: string; ref: string | null }> {
    const form = new FormData();
    const bytes = new Uint8Array(file.buffer);
    form.append('file', new Blob([bytes], { type: file.mimetype }), file.filename);
    form.append('purpose', 'image');
    form.append('ref', file.filename);
    const data = await this.call<any>(cfg, 'POST', 'images/upload/', { form });
    const image = data?.images?.[0];
    const url = absoluteUrl(cfg.url.replace(/\/+$/, ''), image?.url || null);
    if (!url) throw new GhostApiError('O Ghost não devolveu a URL da imagem.', 502);
    return { url, ref: image?.ref || null };
  }
}
