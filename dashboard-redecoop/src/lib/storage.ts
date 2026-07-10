import { environment } from '@/config/environment'

export function resolveStorageUrl(path?: string | null): string {
  if (!path?.trim()) return ''

  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const base = environment.storageUrl.replace(/\/+$/, '')
  const relative = trimmed.replace(/^\/+/, '').replace(/^storage\/+/i, '')
  const encoded = relative
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${base}/${encoded}`
}
