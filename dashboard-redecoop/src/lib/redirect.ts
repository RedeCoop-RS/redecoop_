import { environment } from '@/config/environment'

/** Evita redirect para a mesma origem (causa reload infinito). */
export function redirectToWebsite(): boolean {
  try {
    const target = new URL(environment.websiteUrl, window.location.origin)
    if (target.origin === window.location.origin) {
      return false
    }
    window.location.assign(target.toString())
    return true
  } catch {
    return false
  }
}

export function isSameOriginAsWebsite(): boolean {
  try {
    const target = new URL(environment.websiteUrl, window.location.origin)
    return target.origin === window.location.origin
  } catch {
    return true
  }
}
