import { apiFetchData } from '@/lib/api'
import type {
  CooperationTermDetail,
  CooperationTermImportPreview,
  CooperationTermInput,
  CooperationTermItemInput,
  CooperationTermSummary,
} from '@/types/cooperationTerm'

const base = '/cooperation-terms'

export interface TermList {
  items: CooperationTermSummary[]
  total: number
  page: number
  limit: number
}

export interface TermFile {
  filename: string
  mimeType: string
  contentBase64: string
}

export interface TermSendResult {
  sent: boolean
  detail: string
  recipients: { email: string; name: string; kind: string }[]
  results: { email: string; name: string; kind: string; sent: boolean; detail: string }[]
  skipped: { name: string; reason: string }[]
}

export const cooperationTermService = {
  list(page = 1, limit = 20, q = '') {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (q.trim()) params.set('q', q.trim())
    return apiFetchData<TermList>(`${base}?${params}`)
  },

  get(id: number) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}`)
  },

  create(body: CooperationTermInput) {
    return apiFetchData<CooperationTermDetail>(base, { method: 'POST', body: JSON.stringify(body) })
  },

  update(id: number, body: Partial<CooperationTermInput>) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  saveHospitalUnits(id: number, units: { id?: number; name: string }[]) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/hospital-units`, {
      method: 'PUT',
      body: JSON.stringify({ units }),
    })
  },

  createItem(id: number, body: CooperationTermItemInput) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateItem(id: number, itemId: number, body: CooperationTermItemInput) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  deleteItem(id: number, itemId: number) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/items/${itemId}`, { method: 'DELETE' })
  },

  previewImport(id: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    return apiFetchData<CooperationTermImportPreview>(`${base}/${id}/items/import/preview`, {
      method: 'POST',
      body: form,
    })
  },

  importItems(id: number, file: File, replace: boolean) {
    const form = new FormData()
    form.append('file', file)
    return apiFetchData<CooperationTermDetail>(
      `${base}/${id}/items/import?replace=${replace ? 'true' : 'false'}`,
      { method: 'POST', body: form },
    )
  },

  setInterests(id: number, items: { itemId: number; cooperativeIds: number[] }[]) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/interests`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    })
  },

  setCapacities(id: number, entries: { itemId: number; cooperativeId: number; maxCapacity: number | null }[]) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/capacities`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    })
  },

  recalculate(id: number) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/recalculate`, { method: 'POST' })
  },

  releaseDivision(id: number, released: boolean) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/division-release`, {
      method: 'PUT',
      body: JSON.stringify({ released }),
    })
  },

  setCalendar(id: number, entries: { itemId: number; cooperativeId: number; months: number[] }[]) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/calendar`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    })
  },

  sign(id: number) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/sign`, { method: 'POST' })
  },

  newVersion(id: number) {
    return apiFetchData<CooperationTermDetail>(`${base}/${id}/new-version`, { method: 'POST' })
  },

  send(id: number, message: string) {
    return apiFetchData<TermSendResult>(`${base}/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true, message }),
    })
  },

  sendDivision(id: number, message: string) {
    return apiFetchData<TermSendResult>(`${base}/${id}/send-division`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true, message }),
    })
  },

  async download(id: number, kind: 'pdf' | 'excel') {
    const file = await apiFetchData<TermFile>(`${base}/${id}/export/${kind}`)
    saveBase64File(file)
  },

  async downloadDivision(id: number, kind: 'pdf' | 'excel') {
    const file = await apiFetchData<TermFile>(`${base}/${id}/export/division/${kind}`)
    saveBase64File(file)
  },
}

export function saveBase64File(file: TermFile) {
  const binary = atob(file.contentBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  const url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  link.click()
  URL.revokeObjectURL(url)
}
