import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogCryptoError, BlogCryptoService } from './crypto/blog-crypto.service';
import {
  BlogActionDto,
  BulkBlogDto,
  ListBlogDto,
  SaveBlogPostDto,
  SaveBlogTagDto,
  SaveGhostConnectionDto,
  TestGhostConnectionDto,
} from './dto/blog.dto';
import { GhostConnection } from './entities/ghost-connection.entity';
import { GhostApiError } from './ghost/ghost-api.error';
import { GhostAdminClient } from './ghost/ghost-admin.client';
import { assertGhostAdminKey } from './ghost/ghost-jwt';
import {
  BlogAuthor,
  BlogList,
  BlogPost,
  BlogResource,
  BlogTag,
  BlogWriteInput,
  GhostConfig,
  GhostSiteInfo,
} from './ghost/ghost.types';
import { assertGhostId, ghostKeyHint, normalizeGhostAdminUrl, publishedAtIso } from './blog.validators';

export type ConnectionSource = 'saved' | 'env' | 'mixed' | 'none';

export interface BlogConnectionView {
  configured: boolean;
  source: ConnectionSource;
  adminUrl: string | null;
  hasApiKey: boolean;
  keyHint: string | null;
  usingEnvUrl: boolean;
  usingEnvKey: boolean;
  saved: boolean;
  connected: boolean;
  site: GhostSiteInfo | null;
  error: string | null;
}

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    @InjectRepository(GhostConnection)
    private readonly connections: Repository<GhostConnection>,
    private readonly crypto: BlogCryptoService,
    private readonly ghost: GhostAdminClient,
  ) {}

  async connection(): Promise<BlogConnectionView> {
    const row = await this.row();
    const envUrl = this.envUrl();
    const envKey = this.envKey();
    let resolved: GhostConfig & { source: ConnectionSource } | null = null;
    let error: string | null = null;
    try {
      resolved = await this.resolve(row);
    } catch (cause) {
      error = this.publicMessage(cause);
    }
    let site: GhostSiteInfo | null = null;
    if (resolved && !error) {
      try {
        site = await this.ghost.site(resolved);
      } catch (cause) {
        error = this.publicMessage(cause);
        this.logger.warn(`Ghost indisponível: ${error}`);
      }
    }
    return {
      configured: Boolean(resolved),
      source: resolved?.source || 'none',
      adminUrl: row?.adminUrl || envUrl || null,
      hasApiKey: Boolean(row?.apiKeyCipher || envKey),
      keyHint: row?.keyHint || (envKey ? ghostKeyHint(envKey) : null),
      usingEnvUrl: !row?.adminUrl && Boolean(envUrl),
      usingEnvKey: !row?.apiKeyCipher && Boolean(envKey),
      saved: Boolean(row),
      connected: Boolean(site),
      site,
      error,
    };
  }

  async saveConnection(userId: number, dto: SaveGhostConnectionDto): Promise<BlogConnectionView> {
    const adminUrl = normalizeGhostAdminUrl(dto.adminUrl);
    const row = await this.row();
    let cipher = row?.apiKeyCipher || null;
    let hint = row?.keyHint || null;
    if (dto.apiKey?.trim()) {
      const key = dto.apiKey.trim();
      this.requireKey(key);
      cipher = this.seal(key);
      hint = ghostKeyHint(key);
    } else if (dto.clearKey) {
      cipher = null;
      hint = null;
    }
    const key = cipher ? this.open(cipher) : this.envKey();
    if (!key) {
      throw new BadRequestException('Informe a Admin API key ou defina GHOST_ADMIN_API_KEY no servidor.');
    }
    this.requireKey(key);
    await this.attempt(() => this.ghost.site({ url: adminUrl, key }));
    const entity = this.connections.create({
      ...(row ? { id: row.id } : {}),
      adminUrl,
      apiKeyCipher: cipher,
      keyHint: hint,
      updatedByUserId: userId,
    });
    await this.connections.save(entity);
    return this.connection();
  }

  async deleteConnection(): Promise<BlogConnectionView> {
    const row = await this.row();
    if (row) await this.connections.delete(row.id);
    return this.connection();
  }

  async testConnection(dto: TestGhostConnectionDto): Promise<{ ok: true; site: GhostSiteInfo }> {
    const url = normalizeGhostAdminUrl(dto.adminUrl);
    const key = dto.apiKey?.trim() || (await this.resolve(await this.row()))?.key || this.envKey();
    if (!key) throw new BadRequestException('Informe a Admin API key para testar.');
    this.requireKey(key);
    const site = await this.attempt(() => this.ghost.site({ url, key }));
    return { ok: true, site };
  }

  async list(query: ListBlogDto): Promise<BlogList> {
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.browse(cfg, query.resource || 'post', {
        page: query.page || 1,
        limit: query.limit || 15,
        status: query.status,
        tag: query.tag,
        author: query.author,
        search: query.search,
        order: query.order,
      }),
    );
  }

  async read(id: string, resource: BlogResource): Promise<BlogPost> {
    assertGhostId(id);
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.read(cfg, resource, id));
  }

  async create(dto: SaveBlogPostDto): Promise<BlogPost> {
    const title = (dto.title || '').trim();
    if (!title) throw new BadRequestException('Informe o título.');
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.create(cfg, dto.resource, { ...this.write(dto), title, status: dto.status || 'draft' }));
  }

  async update(id: string, dto: SaveBlogPostDto): Promise<BlogPost> {
    assertGhostId(id);
    if (!dto.updatedAt) {
      throw new BadRequestException('Recarregue o conteúdo antes de salvar (updated_at ausente).');
    }
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.update(cfg, dto.resource, id, this.write(dto)));
  }

  async remove(id: string, resource: BlogResource): Promise<{ ok: true }> {
    assertGhostId(id);
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.remove(cfg, resource, id));
  }

  async publish(id: string, dto: BlogActionDto): Promise<BlogPost> {
    assertGhostId(id);
    const publishedAt = publishedAtIso(dto.publishedAt);
    if (publishedAt && new Date(publishedAt).getTime() > Date.now() + 30_000) {
      return this.schedule(id, { ...dto, publishedAt });
    }
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.update(cfg, dto.resource, id, {
        status: 'published',
        updatedAt: dto.updatedAt,
        publishedAt: publishedAt || undefined,
      }),
    );
  }

  async unpublish(id: string, dto: BlogActionDto): Promise<BlogPost> {
    assertGhostId(id);
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.update(cfg, dto.resource, id, { status: 'draft', updatedAt: dto.updatedAt }),
    );
  }

  async schedule(id: string, dto: BlogActionDto): Promise<BlogPost> {
    assertGhostId(id);
    const publishedAt = publishedAtIso(dto.publishedAt);
    if (!publishedAt || new Date(publishedAt).getTime() <= Date.now() + 15_000) {
      throw new BadRequestException('A data de agendamento precisa estar no futuro.');
    }
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.update(cfg, dto.resource, id, {
        status: 'scheduled',
        publishedAt,
        updatedAt: dto.updatedAt,
      }),
    );
  }

  async duplicate(id: string, resource: BlogResource): Promise<BlogPost> {
    assertGhostId(id);
    const cfg = await this.cfg();
    try {
      const copied = await this.ghost.copy(cfg, resource, id);
      if (!copied.title || /cópia/i.test(copied.title)) return copied;
      try {
        return await this.ghost.update(cfg, resource, copied.id, {
          title: `${copied.title} (cópia)`,
          updatedAt: copied.updatedAt,
          status: 'draft',
        });
      } catch {
        return copied;
      }
    } catch (error) {
      if (error instanceof GhostApiError && (error.status === 404 || error.status === 405)) {
        try {
          return await this.duplicateManually(cfg, resource, id);
        } catch (manual) {
          this.fail(manual);
        }
      }
      this.fail(error);
    }
  }

  async bulk(dto: BulkBlogDto): Promise<{ ok: string[]; failed: Array<{ id: string; message: string }> }> {
    const ok: string[] = [];
    const failed: Array<{ id: string; message: string }> = [];
    for (const item of dto.items) {
      try {
        if (dto.action === 'delete') await this.remove(item.id, item.resource);
        else if (dto.action === 'publish') {
          await this.publish(item.id, { resource: item.resource, updatedAt: item.updatedAt, publishedAt: dto.publishedAt });
        } else if (dto.action === 'unpublish') {
          await this.unpublish(item.id, { resource: item.resource, updatedAt: item.updatedAt });
        } else {
          assertGhostId(item.id);
          const cfg = await this.cfg();
          await this.attempt(() =>
            this.ghost.update(cfg, item.resource, item.id, {
              featured: dto.action === 'feature',
              updatedAt: item.updatedAt,
            }),
          );
        }
        ok.push(item.id);
      } catch (error) {
        failed.push({ id: item.id, message: this.publicMessage(error) });
      }
    }
    return { ok, failed };
  }

  async tags(): Promise<BlogTag[]> {
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.tags(cfg));
  }

  async createTag(dto: SaveBlogTagDto): Promise<BlogTag> {
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.createTag(cfg, { name: dto.name.trim(), slug: dto.slug, description: dto.description ?? null }),
    );
  }

  async updateTag(id: string, dto: SaveBlogTagDto): Promise<BlogTag> {
    assertGhostId(id);
    if (!dto.updatedAt) throw new BadRequestException('Recarregue as tags antes de salvar.');
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.updateTag(cfg, id, {
        name: dto.name.trim(),
        slug: dto.slug,
        description: dto.description ?? null,
        updatedAt: dto.updatedAt,
      }),
    );
  }

  async deleteTag(id: string): Promise<{ ok: true }> {
    assertGhostId(id);
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.deleteTag(cfg, id));
  }

  async authors(): Promise<BlogAuthor[]> {
    const cfg = await this.cfg();
    return this.attempt(() => this.ghost.users(cfg));
  }

  async uploadImage(file?: Express.Multer.File): Promise<{ url: string; ref: string | null }> {
    if (!file?.buffer?.length) throw new BadRequestException('Envie uma imagem.');
    const type = (file.mimetype || '').toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(type)) {
      throw new BadRequestException('Envie uma imagem PNG, JPEG, GIF ou WebP.');
    }
    const filename = (file.originalname || 'imagem').replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'imagem';
    const cfg = await this.cfg();
    return this.attempt(() =>
      this.ghost.uploadImage(cfg, { buffer: file.buffer, mimetype: type, filename }),
    );
  }

  private write(dto: SaveBlogPostDto): BlogWriteInput {
    return {
      title: dto.title?.trim(),
      html: dto.html,
      slug: dto.slug,
      customExcerpt: dto.customExcerpt ?? undefined,
      status: dto.status,
      visibility: dto.visibility,
      featured: dto.featured,
      publishedAt: publishedAtIso(dto.publishedAt),
      featureImage: this.empty(dto.featureImage),
      featureImageAlt: this.empty(dto.featureImageAlt),
      featureImageCaption: this.empty(dto.featureImageCaption),
      metaTitle: this.empty(dto.metaTitle),
      metaDescription: this.empty(dto.metaDescription),
      ogImage: this.empty(dto.ogImage),
      ogTitle: this.empty(dto.ogTitle),
      ogDescription: this.empty(dto.ogDescription),
      twitterImage: this.empty(dto.twitterImage),
      twitterTitle: this.empty(dto.twitterTitle),
      twitterDescription: this.empty(dto.twitterDescription),
      canonicalUrl: this.empty(dto.canonicalUrl),
      tagIds: dto.tagIds,
      authorIds: dto.authorIds,
      updatedAt: dto.updatedAt,
    };
  }

  private empty(value?: string | null): string | null | undefined {
    if (value == null) return value;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private async duplicateManually(cfg: GhostConfig, resource: BlogResource, id: string): Promise<BlogPost> {
    const source = await this.ghost.read(cfg, resource, id);
    const title = /cópia/i.test(source.title) ? source.title : `${source.title} (cópia)`;
    return this.ghost.create(cfg, resource, {
      title,
      ...(source.lexical ? { lexical: source.lexical } : { html: source.html }),
      status: 'draft',
      customExcerpt: source.customExcerpt || null,
      visibility: (source.visibility as BlogWriteInput['visibility']) || 'public',
      featured: false,
      featureImage: source.featureImage,
      featureImageAlt: source.featureImageAlt,
      featureImageCaption: source.featureImageCaption,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      ogImage: source.ogImage,
      ogTitle: source.ogTitle,
      ogDescription: source.ogDescription,
      twitterImage: source.twitterImage,
      twitterTitle: source.twitterTitle,
      twitterDescription: source.twitterDescription,
      canonicalUrl: null,
      tagIds: source.tags.map((tag) => tag.id).filter(Boolean),
      authorIds: source.authors.map((author) => author.id).filter(Boolean),
    });
  }

  private async cfg(): Promise<GhostConfig> {
    let resolved: (GhostConfig & { source: ConnectionSource }) | null;
    try {
      resolved = await this.resolve(await this.row());
    } catch (error) {
      throw new BadRequestException(this.publicMessage(error));
    }
    if (!resolved) {
      throw new BadRequestException(
        'Configure o Ghost em Blog → Conexão, ou defina GHOST_ADMIN_URL e GHOST_ADMIN_API_KEY.',
      );
    }
    return resolved;
  }

  private async resolve(row: GhostConnection | null): Promise<(GhostConfig & { source: ConnectionSource }) | null> {
    const url = row?.adminUrl || this.envUrl();
    let key = '';
    let keyFrom: 'saved' | 'env' | null = null;
    if (row?.apiKeyCipher) {
      key = this.open(row.apiKeyCipher);
      keyFrom = 'saved';
    } else if (this.envKey()) {
      key = this.envKey();
      keyFrom = 'env';
    }
    if (!url || !key) return null;
    const urlFrom = row?.adminUrl ? 'saved' : 'env';
    const source: ConnectionSource = urlFrom === keyFrom ? urlFrom : 'mixed';
    return { url: normalizeGhostAdminUrl(url), key, source };
  }

  private async row(): Promise<GhostConnection | null> {
    const rows = await this.connections.find({ order: { id: 'ASC' }, take: 1 });
    return rows[0] || null;
  }

  private envUrl(): string {
    return process.env.GHOST_ADMIN_URL?.trim() || '';
  }

  private envKey(): string {
    return process.env.GHOST_ADMIN_API_KEY?.trim() || '';
  }

  private async attempt<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.fail(error);
    }
  }

  private requireKey(key: string): string {
    try {
      assertGhostAdminKey(key);
      return key;
    } catch (error) {
      this.fail(error);
    }
  }

  private seal(plain: string): string {
    try {
      return this.crypto.encrypt(plain);
    } catch (error) {
      this.fail(error);
    }
  }

  private open(payload: string): string {
    try {
      return this.crypto.decrypt(payload);
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof BlogCryptoError) throw new BadRequestException(error.message);
    if (error instanceof GhostApiError) {
      if (error.status === 409) throw new ConflictException(error.message);
      if (error.status === 404) throw new NotFoundException(error.message);
      if (error.status === 401 || error.status === 403) {
        throw new BadRequestException(
          'O Ghost recusou a Admin API key. Gere outra em Configurações → Integrações.',
        );
      }
      if (error.status >= 500) throw new BadGatewayException(error.message);
      throw new BadRequestException(error.message);
    }
    throw new BadGatewayException(this.publicMessage(error));
  }

  private publicMessage(error: unknown): string {
    if (error instanceof HttpException) return error.message;
    if (error instanceof GhostApiError || error instanceof BlogCryptoError || error instanceof Error) {
      return error.message;
    }
    return 'Falha ao falar com o Ghost.';
  }
}
