import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getSiteAnalytics, SITE_ANALYTICS_HEARTBEAT_MS } from '@/lib/site-analytics'

/**
 * Envia visitas, tempo na tela, scroll e cliques para o painel (dados anônimos).
 */
export function SiteAnalytics() {
  const location = useLocation()

  useEffect(() => {
    const analytics = getSiteAnalytics()
    if (!analytics) return

    const onScroll = () => analytics.tickScroll()
    const onClick = (event: MouseEvent) => analytics.click(event)
    const onVisibility = () => analytics.visibility(document.hidden)
    const onLeave = () => analytics.flush(true)

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onLeave)

    const heartbeat = window.setInterval(() => analytics.heartbeat(), SITE_ANALYTICS_HEARTBEAT_MS)

    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onLeave)
      window.clearInterval(heartbeat)
    }
  }, [])

  useEffect(() => {
    getSiteAnalytics()?.start(location.pathname)
  }, [location.pathname])

  return null
}
