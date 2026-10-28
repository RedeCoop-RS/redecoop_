import { GhostApiError } from './ghost-api.error';
import { GhostAdminClient } from './ghost-admin.client';
import { GhostConfig, GhostHttpRequest, GhostHttpResult } from './ghost.types';

const id = 'a'.repeat(24);
const key = `${id}:${'ab'.repeat(32)}`;
const cfg: GhostConfig = { url: 'http://ghost.local/', key };

function raw(extra: Record<string, unknown> = {}) {
  return {
    id,
    uuid: 'uuid-1',
    updated_at: '2024-06-01T12:00:00.000Z',
    created_at: '2024-06-01T11:00:00.000Z',
    title: 'Safra',
    slug: 'safra',
    html: '<p>Texto da safra</p>',
    plaintext: 'Texto da safra',
    status: 'draft',
    visibility: 'public',
    featured: false,
    tags: [],
    authors: [],
    ...extra,
  };
}

function client(handler: (request: GhostHttpRequest) => GhostHttpResult | Promise<GhostHttpResult>) {
  const calls: GhostHttpRequest[] = [];
  const api = new GhostAdminClient(async (request) => {
    calls.push(request);
    return handler(request);
  });
  return { api, calls };
}

describe('GhostAdminClient', () => {
  const originalVersion = process.env.GHOST_API_VERSION;
  beforeEach(() => {
    delete process.env.GHOST_API_VERSION;
  });
  afterEach(() => {
    if (originalVersion === undefined) delete process.env.GHOST_API_VERSION;
    else process.env.GHOST_API_VERSION = originalVersion;
  });

  it('cria post com JWT, Accept-Version e source=html sem script', async () => {
    const { api, calls } = client(() => ({ status: 201, data: { posts: [raw()] } }));
    const post = await api.create(cfg, 'post', { title: 'Safra', html: '<p>Oi</p><script>x</script>' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('http://ghost.local/ghost/api/admin/posts/');
    expect(calls[0].url).toContain('source=html');
    expect(calls[0].headers.Authorization).toMatch(/^Ghost [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(calls[0].headers['Accept-Version']).toBe('v6.0');
    expect((calls[0].body as any).posts[0].html).toBe('<p>Oi</p>');
    expect(post.updatedAt).toBe('2024-06-01T12:00:00.000Z');
    expect(post.wordCount).toBe(3);
  });

  it('traduz colisão de updated_at para 409', async () => {
    const { api } = client(() => ({
      status: 409,
      data: { errors: [{ type: 'UpdateCollisionError', message: 'Saving failed' }] },
    }));
    await expect(api.update(cfg, 'post', id, { title: 'Novo', updatedAt: '2024-06-01T12:00:00.000Z' })).rejects.toMatchObject({
      status: 409,
      ghostType: 'UpdateCollisionError',
    } satisfies Partial<GhostApiError>);
  });

  it('monta filtro, paginação e cópia', async () => {
    const { api, calls } = client((request) => {
      if (request.method === 'GET') {
        return {
          status: 200,
          data: {
            posts: [raw()],
            meta: { pagination: { page: 2, limit: 10, pages: 3, total: 25, next: 3, prev: 1 } },
          },
        };
      }
      return { status: 201, data: { posts: [raw({ title: 'Safra (Copy)', status: 'draft' })] } };
    });
    const list = await api.browse(cfg, 'post', { page: 2, limit: 10, status: 'draft', search: 'safra' });
    expect(list.pagination.total).toBe(25);
    expect(calls[0].url).toContain('filter=');
    expect(decodeURIComponent(calls[0].url)).toContain("status:draft");
    expect(decodeURIComponent(calls[0].url)).toContain("title:~'safra'");
    const copy = await api.copy(cfg, 'post', id);
    expect(calls[1].url).toContain(`/posts/${id}/copy/`);
    expect(copy.title).toContain('Copy');
  });

  it('envia a imagem em multipart e devolve URL absoluta', async () => {
    const { api, calls } = client(() => ({
      status: 201,
      data: { images: [{ url: '/content/images/foto.png', ref: 'foto.png' }] },
    }));
    const image = await api.uploadImage(cfg, {
      buffer: Buffer.from('png'),
      mimetype: 'image/png',
      filename: 'foto.png',
    });
    expect(calls[0].body).toBeInstanceOf(FormData);
    expect(calls[0].headers['Content-Type']).toBeUndefined();
    expect(image.url).toBe('http://ghost.local/content/images/foto.png');
  });

  it('lê o post pedindo html e lexical juntos', async () => {
    const { api, calls } = client(() => ({ status: 200, data: { posts: [raw({ lexical: '{"root":{}}' })] } }));
    const post = await api.read(cfg, 'post', id);
    expect(decodeURIComponent(calls[0].url)).toContain('formats=html,plaintext,lexical');
    expect(post.lexical).toContain('root');
  });

  it('atualiza metadados sem source=html para não converter o Lexical', async () => {
    const { api, calls } = client(() => ({ status: 200, data: { posts: [raw()] } }));
    await api.update(cfg, 'post', id, { title: 'Safra 2', updatedAt: '2024-06-01T12:00:00.000Z' });
    expect(calls[0].url).not.toContain('source=html');
    expect((calls[0].body as any).posts[0].html).toBeUndefined();
    expect((calls[0].body as any).posts[0].title).toBe('Safra 2');
  });

  it('pagina tags e usuários no lugar de limit=all', async () => {
    const { api, calls } = client((request) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page') || '1');
      const limit = url.searchParams.get('limit');
      expect(limit).toBe('100');
      expect(url.searchParams.get('limit')).not.toBe('all');
      if (url.pathname.includes('/tags/')) {
        const tags = page === 1
          ? [{ id: '1', name: 'News', slug: 'news', updated_at: '2024-06-01T12:00:00.000Z' }]
          : [{ id: '2', name: 'intercooperação', slug: 'intercooperacao', updated_at: '2024-06-01T12:00:00.000Z' }];
        return {
          status: 200,
          data: { tags, meta: { pagination: { page, limit: 100, pages: 2, total: 2, next: page === 1 ? 2 : null } } },
        };
      }
      return {
        status: 200,
        data: {
          users: [{ id: 'u1', name: 'Ana', slug: 'ana' }],
          meta: { pagination: { page: 1, limit: 100, pages: 1, total: 1, next: null } },
        },
      };
    });
    const tags = await api.tags(cfg);
    expect(tags.map((tag) => tag.slug)).toEqual(['news', 'intercooperacao']);
    expect(calls.filter((call) => call.url.includes('/tags/'))).toHaveLength(2);
    const users = await api.users(cfg);
    expect(users[0].name).toBe('Ana');
  });

  it('respeita GHOST_API_VERSION', async () => {
    const previous = process.env.GHOST_API_VERSION;
    process.env.GHOST_API_VERSION = 'v5.0';
    try {
      const { api, calls } = client(() => ({ status: 200, data: { site: { title: 'X' } } }));
      await api.site(cfg);
      expect(calls[0].headers['Accept-Version']).toBe('v5.0');
    } finally {
      if (previous === undefined) delete process.env.GHOST_API_VERSION;
      else process.env.GHOST_API_VERSION = previous;
    }
  });

  it('lê o site sem embrulhar em array', async () => {
    const { api } = client(() => ({
      status: 200,
      data: { site: { title: 'RedeCoop', description: 'Blog', url: 'http://ghost.local/', version: '5.100.0', logo: '/logo.png' } },
    }));
    await expect(api.site(cfg)).resolves.toMatchObject({ title: 'RedeCoop', version: '5.100.0', logo: 'http://ghost.local/logo.png' });
  });
});
