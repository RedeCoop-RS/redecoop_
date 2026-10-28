import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BlogCryptoService } from './crypto/blog-crypto.service';
import { BlogService } from './blog.service';
import { GhostConnection } from './entities/ghost-connection.entity';
import { GhostApiError } from './ghost/ghost-api.error';
import { GhostAdminClient } from './ghost/ghost-admin.client';
import { assertBlogSuperAdmin } from './security/blog-access';
import { normalizeGhostAdminUrl } from './blog.validators';

const ID = 'a'.repeat(24);
const ID_B = 'b'.repeat(24);
const SECRET = 'cd'.repeat(32);
const KEY = `${ID}:${SECRET}`;
const UPDATED = '2024-06-01T12:00:00.000Z';

function sample(extra: Record<string, unknown> = {}) {
  return {
    id: ID,
    uuid: 'uuid',
    resource: 'post' as const,
    title: 'Safra',
    slug: 'safra',
    html: '<p>Texto</p>',
    plaintext: 'Texto',
    lexical: null,
    mobiledoc: null,
    excerpt: '',
    customExcerpt: '',
    featureImage: null,
    featureImageAlt: null,
    featureImageCaption: null,
    featured: false,
    status: 'draft',
    visibility: 'public',
    publishedAt: null,
    createdAt: UPDATED,
    updatedAt: UPDATED,
    url: null,
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
    ogTitle: null,
    ogDescription: null,
    twitterImage: null,
    twitterTitle: null,
    twitterDescription: null,
    canonicalUrl: null,
    tags: [],
    authors: [{ id: ID, name: 'Ana', slug: 'ana', profileImage: null }],
    readingTime: 1,
    wordCount: 1,
    ...extra,
  };
}

describe('BlogService', () => {
  const original = {
    url: process.env.GHOST_ADMIN_URL,
    key: process.env.GHOST_ADMIN_API_KEY,
    ghostKey: process.env.GHOST_ENCRYPTION_KEY,
    mailKey: process.env.MAILBOX_ENCRYPTION_KEY,
  };
  let service: BlogService;
  let stored: GhostConnection | null;
  const ghost = {
    site: jest.fn(),
    browse: jest.fn(),
    read: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    copy: jest.fn(),
    tags: jest.fn(),
    createTag: jest.fn(),
    updateTag: jest.fn(),
    deleteTag: jest.fn(),
    users: jest.fn(),
    uploadImage: jest.fn(),
  };

  beforeEach(async () => {
    stored = null;
    process.env.GHOST_ADMIN_URL = 'http://ghost.local';
    process.env.GHOST_ADMIN_API_KEY = KEY;
    process.env.GHOST_ENCRYPTION_KEY = 'chave-de-teste-do-blog';
    Object.values(ghost).forEach((fn) => fn.mockReset());
    ghost.site.mockResolvedValue({
      title: 'Blog RedeCoop',
      description: '',
      url: 'http://ghost.local',
      version: '5.100',
      logo: null,
    });

    const repo = {
      find: jest.fn(async () => (stored ? [stored] : [])),
      create: jest.fn((value) => ({ ...(value || {}) })),
      save: jest.fn(async (value) => {
        stored = { id: stored?.id || 1, ...stored, ...value };
        return stored;
      }),
      delete: jest.fn(async () => {
        stored = null;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BlogService,
        BlogCryptoService,
        { provide: getRepositoryToken(GhostConnection), useValue: repo },
        { provide: GhostAdminClient, useValue: ghost },
      ],
    }).compile();
    service = moduleRef.get(BlogService);
  });

  afterAll(() => {
    process.env.GHOST_ADMIN_URL = original.url;
    process.env.GHOST_ADMIN_API_KEY = original.key;
    process.env.GHOST_ENCRYPTION_KEY = original.ghostKey;
    process.env.MAILBOX_ENCRYPTION_KEY = original.mailKey;
  });

  it('normaliza a URL e não devolve a chave', async () => {
    const view = await service.saveConnection(7, { adminUrl: 'http://ghost.local/ghost/', apiKey: KEY });
    expect(stored?.adminUrl).toBe('http://ghost.local');
    expect(stored?.apiKeyCipher).toBeTruthy();
    expect(stored?.apiKeyCipher).not.toContain(SECRET);
    expect(JSON.stringify(view)).not.toContain(SECRET);
    expect(view.connected).toBe(true);
    expect(view.source).toBe('saved');
    expect(view.site?.title).toBe('Blog RedeCoop');
    expect(view.keyHint).toBe(`••••${SECRET.slice(-4)}`);
  });

  it('usa a chave de ambiente quando não há chave salva', async () => {
    stored = { id: 1, adminUrl: 'https://blog.redecoop.test', apiKeyCipher: null, keyHint: null } as GhostConnection;
    const view = await service.connection();
    expect(view.source).toBe('mixed');
    expect(view.usingEnvKey).toBe(true);
    expect(view.configured).toBe(true);
    expect(ghost.site).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://blog.redecoop.test', key: KEY }));
  });

  it('recusa salvar sem chave e sem variável', async () => {
    delete process.env.GHOST_ADMIN_API_KEY;
    await expect(service.saveConnection(1, { adminUrl: 'http://ghost.local' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa chave inválida e chave de criptografia ausente', async () => {
    await expect(service.saveConnection(1, { adminUrl: 'http://ghost.local', apiKey: 'sem-formato' })).rejects.toThrow(/id:secret/);
    delete process.env.GHOST_ENCRYPTION_KEY;
    delete process.env.MAILBOX_ENCRYPTION_KEY;
    await expect(service.saveConnection(1, { adminUrl: 'http://ghost.local', apiKey: KEY })).rejects.toThrow(/GHOST_ENCRYPTION_KEY/);
  });

  it('apaga a conexão salva e segue só com o ambiente', async () => {
    await service.saveConnection(1, { adminUrl: 'http://ghost.local', apiKey: KEY });
    const view = await service.deleteConnection();
    expect(stored).toBeNull();
    expect(view.source).toBe('env');
  });

  it('transforma 401 do Ghost em 400 para não derrubar a sessão do painel', async () => {
    ghost.browse.mockRejectedValue(new GhostApiError('unauthorized', 401));
    const error = await service.list({}).catch((cause) => cause);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getStatus()).toBe(400);
  });

  it('exige updated_at e propaga conflito 409', async () => {
    await expect(service.update(ID, { resource: 'post', title: 'Novo' })).rejects.toThrow(/updated_at/);
    ghost.update.mockRejectedValue(new GhostApiError('colisão', 409, 'UpdateCollisionError'));
    await expect(service.update(ID, { resource: 'post', title: 'Novo', updatedAt: UPDATED })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('agenda só no futuro e derruba para rascunho', async () => {
    await expect(
      service.schedule(ID, { resource: 'post', updatedAt: UPDATED, publishedAt: '2020-01-01T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ghost.update).not.toHaveBeenCalled();

    const future = new Date(Date.now() + 86_400_000).toISOString();
    ghost.update.mockResolvedValue(sample({ status: 'scheduled', publishedAt: future }));
    await service.publish(ID, { resource: 'post', updatedAt: UPDATED, publishedAt: future });
    expect(ghost.update).toHaveBeenCalledWith(
      expect.anything(),
      'post',
      ID,
      expect.objectContaining({ status: 'scheduled', publishedAt: future }),
    );

    ghost.update.mockResolvedValue(sample({ status: 'draft' }));
    await service.unpublish(ID, { resource: 'post', updatedAt: UPDATED });
    expect(ghost.update).toHaveBeenLastCalledWith(
      expect.anything(),
      'post',
      ID,
      expect.objectContaining({ status: 'draft' }),
    );
  });

  it('duplica manualmente quando o Ghost não tem /copy/', async () => {
    ghost.copy.mockRejectedValue(new GhostApiError('missing', 404));
    ghost.read.mockResolvedValue(
      sample({ html: '<p>Original</p>', lexical: '{"root":{}}', title: 'Safra' }),
    );
    ghost.create.mockResolvedValue(sample({ title: 'Safra (cópia)', status: 'draft' }));
    const copy = await service.duplicate(ID, 'post');
    expect(copy.title).toContain('cópia');
    expect(ghost.create).toHaveBeenCalledWith(
      expect.anything(),
      'post',
      expect.objectContaining({ status: 'draft', title: 'Safra (cópia)', lexical: '{"root":{}}' }),
    );
    expect(ghost.create.mock.calls[0][2].html).toBeUndefined();
  });

  it('ação em massa continua depois de uma falha', async () => {
    ghost.remove.mockResolvedValueOnce({ ok: true }).mockRejectedValueOnce(new GhostApiError('não achei', 404));
    const result = await service.bulk({
      action: 'delete',
      items: [
        { id: ID, resource: 'post', updatedAt: UPDATED },
        { id: ID_B, resource: 'page', updatedAt: UPDATED },
      ],
    });
    expect(result.ok).toEqual([ID]);
    expect(result.failed[0].id).toBe(ID_B);
  });

  it('pede configuração quando não há URL nem chave', async () => {
    delete process.env.GHOST_ADMIN_URL;
    delete process.env.GHOST_ADMIN_API_KEY;
    await expect(service.list({})).rejects.toThrow(/Configure o Ghost/);
  });

  it('só o papel ADMIN passa', () => {
    expect(() => assertBlogSuperAdmin({ role: 'ADMIN' })).not.toThrow();
    expect(() => assertBlogSuperAdmin({ role: 'COOPERATIVE' })).toThrow(ForbiddenException);
    expect(() => assertBlogSuperAdmin(null)).toThrow(ForbiddenException);
  });

  it('remove /ghost do fim da URL', () => {
    expect(normalizeGhostAdminUrl('https://blog.example.com/ghost/')).toBe('https://blog.example.com');
  });
});
