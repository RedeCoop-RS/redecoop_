import { environment } from '@/config/environment'

const VISITOR_KEY = 'rc_vid'
const SESSION_KEY = 'rc_sid'
const SESSION_MARK = 'rc_sid_sent'
const OPT_OUT_KEY = 'rc_analytics_off'
const COLLECT_PATH = '/public/website-analytics/collect'
const FLUSH_MS = 800
const HEARTBEAT_MS = 15000
const MAX_QUEUE = 30

export type AnalyticsEvent =
  | {
      type: 'session'
      path: string
      referrer?: string
      userAgent?: string
      deviceType: 'desktop' | 'mobile' | 'tablet'
      viewportW: number
      viewportH: number
    }
  | {
      type: 'pageview'
      path: string
      title: string
    }
  | {
      type: 'heartbeat'
      path: string
      durationMs: number
      maxScrollPct: number
    }
  | {
      type: 'click'
      path: string
      xPct: number
      yPct: number
    }

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function storageGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function storageSet(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
}

function isOptedOut(): boolean {
  return storageGet(localStorage, OPT_OUT_KEY) === '1'
}

function isEnabled(): boolean {
  const flag = import.meta.env.VITE_SITE_ANALYTICS
  if (flag === '0' || flag === 'false') return false
  return typeof window !== 'undefined' && !isOptedOut()
}

function deviceType(): 'desktop' | 'mobile' | 'tablet' {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function ids() {
  let visitorId = storageGet(localStorage, VISITOR_KEY)
  if (!visitorId) {
    visitorId = uuid()
    storageSet(localStorage, VISITOR_KEY, visitorId)
  }
  let sessionId = storageGet(sessionStorage, SESSION_KEY)
  if (!sessionId) {
    sessionId = uuid()
    storageSet(sessionStorage, SESSION_KEY, sessionId)
  }
  return { visitorId, sessionId }
}

function scrollPct(): number {
  const el = document.documentElement
  const scrollable = el.scrollHeight - el.clientHeight
  if (scrollable <= 0) return 100
  return Math.min(100, Math.round((window.scrollY / scrollable) * 100))
}

class SiteAnalyticsClient {
  private queue: AnalyticsEvent[] = []
  private timer: number | null = null
  private startedAt = Date.now()
  private path = ''
  private maxScroll = 0
  private failed = 0
  private hidden = false

  start(path: string) {
    if (!isEnabled()) return
    this.flushPage(true)
    this.path = path || '/'
    this.startedAt = Date.now()
    this.maxScroll = scrollPct()
    this.ensureSession()
    this.push({ type: 'pageview', path: this.path, title: document.title.slice(0, 180) })
    this.flush()
  }

  tickScroll() {
    if (!isEnabled() || this.hidden) return
    this.maxScroll = Math.max(this.maxScroll, scrollPct())
  }

  click(event: MouseEvent) {
    if (!isEnabled() || event.button !== 0) return
    const doc = document.documentElement
    const width = Math.max(doc.scrollWidth, window.innerWidth, 1)
    const height = Math.max(doc.scrollHeight, window.innerHeight, 1)
    const x = event.pageX
    const y = event.pageY
    if (x < 0 || y < 0) return
    this.push({
      type: 'click',
      path: this.path,
      xPct: Math.min(100, Math.max(0, Math.round((x / width) * 100))),
      yPct: Math.min(100, Math.max(0, Math.round((y / height) * 100))),
    })
  }

  heartbeat() {
    if (!isEnabled() || this.hidden) return
    this.maxScroll = Math.max(this.maxScroll, scrollPct())
    this.push({
      type: 'heartbeat',
      path: this.path,
      durationMs: Date.now() - this.startedAt,
      maxScrollPct: this.maxScroll,
    })
  }

  visibility(hidden: boolean) {
    this.hidden = hidden
    if (hidden) this.flushPage(false)
  }

  flush(keepalive = false) {
    if (!this.queue.length || !isEnabled() || this.failed >= 5) return
    const events = this.queue.splice(0, MAX_QUEUE)
    const { visitorId, sessionId } = ids()
    const body = JSON.stringify({ visitorId, sessionId, events })
    const url = `${environment.api}${COLLECT_PATH}`

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive,
      credentials: 'omit',
    })
      .then((response) => {
        if (!response.ok) {
          this.failed += 1
          if (import.meta.env.DEV) {
            console.warn('[site-analytics] collect falhou', response.status, url)
          }
        } else {
          this.failed = 0
        }
      })
      .catch((error) => {
        this.failed += 1
        if (import.meta.env.DEV) {
          console.warn('[site-analytics] collect erro', url, error)
        }
        if (keepalive && typeof navigator.sendBeacon === 'function') {
          navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
          return
        }
        this.queue.unshift(...events)
      })
  }

  private ensureSession() {
    if (storageGet(sessionStorage, SESSION_MARK) === '1') return
    const referrer =
      document.referrer && !document.referrer.includes(window.location.host)
        ? document.referrer.slice(0, 300)
        : undefined
    this.push({
      type: 'session',
      path: this.path,
      referrer,
      userAgent: navigator.userAgent.slice(0, 180),
      deviceType: deviceType(),
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
    })
    storageSet(sessionStorage, SESSION_MARK, '1')
  }

  private flushPage(immediate: boolean) {
    if (!this.path) return
    const durationMs = Date.now() - this.startedAt
    if (durationMs < 400) {
      if (immediate) this.flush(true)
      return
    }
    this.push({
      type: 'heartbeat',
      path: this.path,
      durationMs,
      maxScrollPct: this.maxScroll,
    })
    this.flush(true)
  }

  private push(event: AnalyticsEvent) {
    if (this.queue.length >= MAX_QUEUE) this.flush()
    this.queue.push(event)
    if (this.timer != null) return
    this.timer = window.setTimeout(() => {
      this.timer = null
      this.flush()
    }, FLUSH_MS)
  }
}

let client: SiteAnalyticsClient | null = null

export function getSiteAnalytics(): SiteAnalyticsClient | null {
  if (!isEnabled()) return null
  if (!client) client = new SiteAnalyticsClient()
  return client
}

export const SITE_ANALYTICS_HEARTBEAT_MS = HEARTBEAT_MS
