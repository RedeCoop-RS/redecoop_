import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function ensureGtag(measurementId: string) {
  if (typeof window === 'undefined') return
  if (window.gtag) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)
}

/**
 * Carrega GA4 quando `VITE_GA_MEASUREMENT_ID` está definido (ex.: G-XXXXXXXX).
 * Envia page_view a cada mudança de rota.
 */
export function Analytics() {
  const location = useLocation()

  useEffect(() => {
    if (!GA_ID || !GA_ID.startsWith('G-')) return
    ensureGtag(GA_ID)
  }, [])

  useEffect(() => {
    if (!GA_ID || !GA_ID.startsWith('G-') || !window.gtag) return
    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: location.pathname + location.search,
    })
  }, [location.pathname, location.search])

  return null
}
