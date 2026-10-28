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
  it('cria post com JWT, Accept-Version e source=html sem script', async () => {
    const { api, calls } = client(() => ({ status: 201, data: { posts: [raw()] } }));
    const post = await api.create(cfg, 'post', { title: 'Safra', html: '<p>Oi</p><script>x</script>' });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('http://ghost.local/ghost/api/admin/posts/');
    expect(calls[0].url).toContain('source=html');
    expect(calls[0].headers.Authorization).toMatch(/^Ghost [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(calls[0].headers['Accept-Version']).toBe('v5.0');
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

  it('lê o site sem embrulhar em array', async () => {
    const { api } = client(() => ({
      status: 200,
      data: { site: { title: 'RedeCoop', description: 'Blog', url: 'http://ghost.local/', version: '5.100.0', logo: '/logo.png' } },
    }));
    await expect(api.site(cfg)).resolves.toMatchObject({ title: 'RedeCoop', version: '5.100.0', logo: 'http://ghost.local/logo.png' });
  });
});
