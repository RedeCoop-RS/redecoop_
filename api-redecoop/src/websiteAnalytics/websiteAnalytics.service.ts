import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebsiteSession, WebsiteDeviceType } from './entities/websiteSession.entity';
import { WebsitePageView } from './entities/websitePageView.entity';
import { WebsiteClick } from './entities/websiteClick.entity';
import { AnalyticsEventDto, CollectAnalyticsDto } from './Dtos/collectAnalytics.dto';
import { AnalyticsHeatmapQueryDto, AnalyticsRangeDto } from './Dtos/analyticsQuery.dto';

const BOT_UA =
  /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|facebookexternalhit|slurp|lighthouse|pagespeed|prerender|headlesschrome/i;

const LIVE_WINDOW_MS = 5 * 60 * 1000;
const MAX_HITS_PER_HOUR = 1800;

type Range = { from: Date; to: Date };

@Injectable()
export class WebsiteAnalyticsService {
  private readonly logger = new Logger(WebsiteAnalyticsService.name);
  private readonly hits = new Map<string, number[]>();

  constructor(
    @InjectRepository(WebsiteSession)
    private readonly sessionRepo: Repository<WebsiteSession>,
    @InjectRepository(WebsitePageView)
    private readonly pageViewRepo: Repository<WebsitePageView>,
    @InjectRepository(WebsiteClick)
    private readonly clickRepo: Repository<WebsiteClick>,
  ) {}

  async collect(payload: CollectAnalyticsDto, userAgentHeader?: string): Promise<void> {
    const visitorId = payload.visitorId;
    const sessionId = payload.sessionId;

    if (!this.allow(visitorId)) return;

    const ua = this.clip(
      payload.events.find((e) => e.userAgent)?.userAgent || userAgentHeader,
      180,
    );
    if (ua && BOT_UA.test(ua)) return;

    for (const event of payload.events) {
      try {
        await this.handleEvent(visitorId, sessionId, event, ua);
      } catch (error) {
        this.logger.warn(`analytics event ${event.type} failed: ${(error as Error).message}`);
      }
    }
  }

  async overview(query: AnalyticsRangeDto) {
    const { from, to } = this.range(query);
    const liveSince = new Date(Date.now() - LIVE_WINDOW_MS);

    const [sessionRow, pageRow, liveRow, deviceRows] = await Promise.all([
      this.sessionRepo
        .createQueryBuilder('s')
        .select('COUNT(*)', 'sessions')
        .addSelect('COUNT(DISTINCT s.visitor_id)', 'visitors')
        .where('s.started_at >= :from AND s.started_at < :to', { from, to })
        .getRawOne<{ sessions: string; visitors: string }>(),
      this.pageViewRepo
        .createQueryBuilder('p')
        .select('COUNT(*)', 'pageViews')
        .addSelect('COALESCE(AVG(p.duration_ms), 0)', 'avgDurationMs')
        .addSelect('COALESCE(AVG(p.max_scroll_pct), 0)', 'avgScrollPct')
        .where('p.created_at >= :from AND p.created_at < :to', { from, to })
        .getRawOne<{ pageViews: string; avgDurationMs: string; avgScrollPct: string }>(),
      this.sessionRepo
        .createQueryBuilder('s')
        .select('COUNT(DISTINCT s.visitor_id)', 'live')
        .where('s.last_seen_at >= :liveSince', { liveSince })
        .getRawOne<{ live: string }>(),
      this.sessionRepo
        .createQueryBuilder('s')
        .select('s.device_type', 'deviceType')
        .addSelect('COUNT(*)', 'total')
        .where('s.started_at >= :from AND s.started_at < :to', { from, to })
        .groupBy('s.device_type')
        .getRawMany<{ deviceType: string; total: string }>(),
    ]);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      liveVisitors: Number(liveRow?.live ?? 0),
      visitors: Number(sessionRow?.visitors ?? 0),
      sessions: Number(sessionRow?.sessions ?? 0),
      pageViews: Number(pageRow?.pageViews ?? 0),
      avgDurationMs: Math.round(Number(pageRow?.avgDurationMs ?? 0)),
      avgScrollPct: Math.round(Number(pageRow?.avgScrollPct ?? 0)),
      devices: deviceRows.map((row) => ({
        name: row.deviceType || 'desktop',
        y: Number(row.total),
      })),
    };
  }

  async pages(query: AnalyticsRangeDto) {
    const { from, to } = this.range(query);

    const rows = await this.pageViewRepo
      .createQueryBuilder('p')
      .select('p.path', 'path')
      .addSelect('COUNT(*)', 'views')
      .addSelect('COUNT(DISTINCT p.visitor_id)', 'visitors')
      .addSelect('COALESCE(AVG(p.duration_ms), 0)', 'avgDurationMs')
      .addSelect('COALESCE(SUM(p.duration_ms), 0)', 'totalDurationMs')
      .addSelect('COALESCE(AVG(p.max_scroll_pct), 0)', 'avgScrollPct')
      .where('p.created_at >= :from AND p.created_at < :to', { from, to })
      .groupBy('p.path')
      .orderBy('views', 'DESC')
      .limit(40)
      .getRawMany<{
        path: string;
        views: string;
        visitors: string;
        avgDurationMs: string;
        totalDurationMs: string;
        avgScrollPct: string;
      }>();

    return rows.map((row) => ({
      path: row.path,
      views: Number(row.views),
      visitors: Number(row.visitors),
      avgDurationMs: Math.round(Number(row.avgDurationMs)),
      totalDurationMs: Number(row.totalDurationMs),
      avgScrollPct: Math.round(Number(row.avgScrollPct)),
    }));
  }

  async timeseries(query: AnalyticsRangeDto) {
    const { from, to } = this.range(query);

    const rows = await this.pageViewRepo
      .createQueryBuilder('p')
      .select('DATE(p.created_at)', 'day')
      .addSelect('COUNT(*)', 'pageViews')
      .addSelect('COUNT(DISTINCT p.visitor_id)', 'visitors')
      .where('p.created_at >= :from AND p.created_at < :to', { from, to })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string | Date; pageViews: string; visitors: string }>();

    return rows.map((row) => ({
      day: this.asDay(row.day),
      pageViews: Number(row.pageViews),
      visitors: Number(row.visitors),
    }));
  }

  async heatmap(query: AnalyticsHeatmapQueryDto) {
    const { from, to } = this.range(query);
    const path = this.normalizePath(query.path || '/');

    const rows = await this.clickRepo
      .createQueryBuilder('c')
      .select('c.x_pct', 'xPct')
      .addSelect('c.y_pct', 'yPct')
      .addSelect('COUNT(*)', 'hits')
      .where('c.path = :path AND c.created_at >= :from AND c.created_at < :to', { path, from, to })
      .groupBy('c.x_pct')
      .addGroupBy('c.y_pct')
      .getRawMany<{ xPct: string; yPct: string; hits: string }>();

    const cells = rows.map((row) => ({
      xPct: Number(row.xPct),
      yPct: Number(row.yPct),
      hits: Number(row.hits),
    }));

    const scrollRows = await this.pageViewRepo
      .createQueryBuilder('p')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN p.max_scroll_pct >= 25 THEN 1 ELSE 0 END)', 'p25')
      .addSelect('SUM(CASE WHEN p.max_scroll_pct >= 50 THEN 1 ELSE 0 END)', 'p50')
      .addSelect('SUM(CASE WHEN p.max_scroll_pct >= 75 THEN 1 ELSE 0 END)', 'p75')
      .addSelect('SUM(CASE WHEN p.max_scroll_pct >= 90 THEN 1 ELSE 0 END)', 'p90')
      .where('p.path = :path AND p.created_at >= :from AND p.created_at < :to', { path, from, to })
      .getRawOne<{ total: string; p25: string; p50: string; p75: string; p90: string }>();

    const total = Number(scrollRows?.total ?? 0);

    return {
      path,
      totalClicks: cells.reduce((sum, cell) => sum + cell.hits, 0),
      cells,
      scroll: {
        views: total,
        reached25: Number(scrollRows?.p25 ?? 0),
        reached50: Number(scrollRows?.p50 ?? 0),
        reached75: Number(scrollRows?.p75 ?? 0),
        reached90: Number(scrollRows?.p90 ?? 0),
      },
    };
  }

  private async handleEvent(
    visitorId: string,
    sessionId: string,
    event: AnalyticsEventDto,
    userAgent?: string | null,
  ) {
    if (event.type === 'session') {
      await this.upsertSession(visitorId, sessionId, event, userAgent);
      return;
    }

    await this.touchSession(sessionId);

    if (event.type === 'pageview') {
      const path = this.normalizePath(event.path);
      if (!path) return;
      await this.pageViewRepo.insert({
        visitorId,
        sessionId,
        path,
        title: this.clip(event.title, 180),
        durationMs: 0,
        maxScrollPct: 0,
        startedAt: new Date(),
      });
      return;
    }

    if (event.type === 'heartbeat') {
      const path = this.normalizePath(event.path);
      if (!path) return;
      const durationMs = Math.min(Math.max(event.durationMs ?? 0, 0), 3_600_000);
      const maxScrollPct = Math.min(Math.max(event.maxScrollPct ?? 0, 0), 100);
      await this.pageViewRepo.query(
        `UPDATE website_page_view
         SET duration_ms = GREATEST(duration_ms, ?),
             max_scroll_pct = GREATEST(max_scroll_pct, ?)
         WHERE session_id = ? AND path = ?
         ORDER BY id DESC
         LIMIT 1`,
        [durationMs, maxScrollPct, sessionId, path],
      );
      return;
    }

    if (event.type === 'click') {
      const path = this.normalizePath(event.path);
      if (!path || event.xPct == null || event.yPct == null) return;
      await this.clickRepo.insert({
        visitorId,
        sessionId,
        path,
        xPct: this.bucket(event.xPct),
        yPct: this.bucket(event.yPct),
      });
    }
  }

  private async upsertSession(
    visitorId: string,
    sessionId: string,
    event: AnalyticsEventDto,
    userAgent?: string | null,
  ) {
    const existing = await this.sessionRepo.findOne({ where: { sessionId } });
    const now = new Date();
    if (existing) {
      existing.lastSeenAt = now;
      await this.sessionRepo.save(existing);
      return;
    }

    await this.sessionRepo.insert({
      visitorId,
      sessionId,
      deviceType: this.device(event.deviceType),
      referrer: this.clip(event.referrer, 300),
      landingPath: this.normalizePath(event.path) || '/',
      userAgent: this.clip(userAgent, 180),
      viewportW: event.viewportW ?? null,
      viewportH: event.viewportH ?? null,
      startedAt: now,
      lastSeenAt: now,
    });
  }

  private async touchSession(sessionId: string) {
    await this.sessionRepo.update({ sessionId }, { lastSeenAt: new Date() });
  }

  private allow(visitorId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;
    const prev = (this.hits.get(visitorId) ?? []).filter((t) => t > windowStart);
    if (prev.length >= MAX_HITS_PER_HOUR) return false;
    prev.push(now);
    this.hits.set(visitorId, prev);
    if (this.hits.size > 5000) {
      for (const [key, times] of this.hits) {
        const next = times.filter((t) => t > windowStart);
        if (next.length === 0) this.hits.delete(key);
        else this.hits.set(key, next);
      }
    }
    return true;
  }

  private range(query: AnalyticsRangeDto): Range {
    const to = this.endOfDay(query.to) ?? new Date();
    const from = this.startOfDay(query.from) ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (from > to) return { from: to, to: from };
    return { from, to };
  }

  private startOfDay(value?: string): Date | null {
    if (!value) return null;
    const day = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    return new Date(`${day}T00:00:00.000Z`);
  }

  private endOfDay(value?: string): Date | null {
    if (!value) return null;
    const day = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    return new Date(`${day}T23:59:59.999Z`);
  }

  private normalizePath(path?: string): string | null {
    if (!path) return null;
    let value = path.trim();
    if (!value.startsWith('/')) value = `/${value}`;
    const q = value.indexOf('?');
    if (q >= 0) value = value.slice(0, q);
    const h = value.indexOf('#');
    if (h >= 0) value = value.slice(0, h);
    value = value.replace(/\/{2,}/g, '/');
    if (value.length > 1) value = value.replace(/\/+$/, '');
    if (value.length > 180) value = value.slice(0, 180);
    if (!/^\/[a-zA-Z0-9\-._/~]*$/.test(value)) return null;
    if (value.includes('completar-cadastro')) return null;
    return value || '/';
  }

  private device(value?: string): WebsiteDeviceType {
    if (value === 'mobile' || value === 'tablet' || value === 'desktop') return value;
    return 'desktop';
  }

  private bucket(pct: number): number {
    const n = Math.min(100, Math.max(0, Math.round(pct)));
    return n >= 100 ? 98 : n - (n % 2);
  }

  private clip(value: string | null | undefined, max: number): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
  }

  private asDay(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }
}
