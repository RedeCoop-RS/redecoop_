import { apiFetch, apiFetchData, apiFetchPaginated } from '@/lib/api'
import type { FaqItem, Notification, PanelConfig, RegistrationRequest, Visitant } from '@/types'

export const faqService = {
  list(page = 1, limit = 50) {
    return apiFetchPaginated<FaqItem>('/common/faq/list', page, limit)
  },

  view(id: number) {
    return apiFetchData<FaqItem>(`/common/faq/view/${id}`)
  },

  create(data: { title: string; content: string }) {
    return apiFetch('/root/faq/create', { method: 'POST', body: JSON.stringify(data) })
  },

  update(id: number, data: { title: string; content: string }) {
    return apiFetch(`/root/faq/update/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  delete(id: number) {
    return apiFetch(`/root/faq/delete/${id}`, { method: 'DELETE' })
  },
}

export const notificationService = {
  list(page = 1, limit = 20) {
    return apiFetchPaginated<Notification>('/common/notification/list', page, limit)
  },

  countUnread() {
    return apiFetchData<number>('/common/notification/count-unread')
  },

  markAsRead(id: number) {
    return apiFetch(`/common/notification/mark-as-read/${id}`, { method: 'PUT' })
  },

  delete(id: number) {
    return apiFetch(`/common/notification/delete/${id}`, { method: 'DELETE' })
  },
}

export const configService = {
  view() {
    return apiFetchData<PanelConfig>('/root/config/view')
  },

  update(data: PanelConfig & { valueRanges?: number[][] }) {
    return apiFetch('/root/config/update', { method: 'PUT', body: JSON.stringify(data) })
  },
}

export const visitantService = {
  list(page = 1, limit = 10) {
    return apiFetchPaginated<Visitant>('/root/visitant/list', page, limit)
  },

  changeStatus(id: number, active: boolean) {
    return apiFetch(`/root/visitant/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: active }),
    })
  },
}

export const requestService = {
  list(page = 1, limit = 10) {
    return apiFetchPaginated<RegistrationRequest>('/root/request/list', page, limit)
  },

  delete(id: number) {
    return apiFetch(`/root/request/${id}/delete`, { method: 'DELETE' })
  },
}

export const locationService = {
  states() {
    return apiFetchData<{ id: number; name: string; uf?: string; abbreviation?: string }[]>('/state/list')
  },

  citiesByState(stateId: number) {
    return apiFetchData<
      {
        id: number
        name: string
        stateId?: number
        corede?: string
        functional_region?: string
      }[]
    >(`/city/find-by-state/${stateId}`)
  },

  searchCity(q: string) {
    return apiFetchData<
      { id: number; name: string; state?: { abbreviation?: string }; stateId?: number }[]
    >(`/city/search?q=${encodeURIComponent(q)}`)
  },
}

export type MapPlace = {
  name: string
  address: string
  coordinates: { latitude: number; longitude: number }
}

export function haversineKm(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const lat1 = toRad(Number(startLat))
  const lat2 = toRad(Number(endLat))
  const dLat = lat2 - lat1
  const dLng = toRad(Number(endLng) - Number(startLng))
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const mapService = {
  autoComplete(q: string) {
    if (q.length < 2) return Promise.resolve([] as MapPlace[])
    return apiFetchData<MapPlace[]>(
      `/common/maps/auto-complete?q=${encodeURIComponent(q)}`,
    )
  },

  async distance(startLat: number, startLng: number, endLat: number, endLng: number) {
    const lat1 = Number(startLat)
    const lng1 = Number(startLng)
    const lat2 = Number(endLat)
    const lng2 = Number(endLng)

    const params = new URLSearchParams({
      startLat: String(lat1),
      startLng: String(lng1),
      endLat: String(lat2),
      endLng: String(lng2),
    })

    try {
      const result = await apiFetchData<unknown>(`/common/maps/distance?${params}`)
      const parsed =
        typeof result === 'number'
          ? result
          : typeof result === 'string'
            ? Number(result)
            : Number((result as { distance?: number | string })?.distance)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    } catch {
      /* Mapbox indisponível — usa estimativa por coordenadas */
    }

    return Number(haversineKm(lat1, lng1, lat2, lng2).toFixed(2))
  },
}

export const reportService = {
  list() {
    return apiFetchData<import('@/types').ReportDefinition[]>('/report')
  },

  generate(data: Record<string, unknown>) {
    return apiFetchData<{ filename: string }>('/report/generator', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export const cafService = {
  getPanel(cooperativeId?: number) {
    const q = cooperativeId ? `?cooperativeId=${cooperativeId}` : ''
    return apiFetchData<import('@/types').CafPanelData>(`/caf/panel${q}`)
  },

  syncStart() {
    return apiFetchData<CafSyncJob>('/root/caf/sync/start', { method: 'POST' })
  },

  syncStatus(jobId: string) {
    return apiFetchData<CafSyncJob>(`/root/caf/sync/status/${jobId}`)
  },

  syncActive() {
    return apiFetchData<CafSyncJob | null>('/root/caf/sync/active')
  },

  syncVncInfo() {
    return apiFetchData<CafVncInfo>('/root/caf/sync/vnc-info')
  },

  syncCancel(jobId: string) {
    return apiFetchData<CafSyncJob>(`/root/caf/sync/cancel/${jobId}`, { method: 'POST' })
  },
}

export interface CafVncInfo {
  mode: string
  host: string | null
  port: string
  display: string
  tunnel: string | null
  clientUrl: string
}

export type CafSyncStatus = 'queued' | 'captcha' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface CafSyncLogEntry {
  ts: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

export interface CafSyncInactiveCoop {
  cnpj: string
  razaoSocial: string
  situacao: string
}

export interface CafSyncResult {
  idsTotal: number
  idsFound: number
  idsMissing: number
  idsMissingList: string[]
  extratosOk: number
  extratosFailed: number
  extratosFailedList: string[]
  mysqlInserted: number
  mysqlUpdated: number
  mysqlFailures: number
  inactive: CafSyncInactiveCoop[]
  duplicadosCaf: number
}

export interface CafSyncJob {
  id: string
  status: CafSyncStatus
  phase: string
  progress?: { current: number; total: number; message?: string }
  logs: CafSyncLogEntry[]
  result?: CafSyncResult
  error?: string
  startedAt: string
  finishedAt?: string
}
