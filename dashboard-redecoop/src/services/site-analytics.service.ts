import { apiFetchData } from '@/lib/api'
import type {
  SiteAnalyticsHeatmap,
  SiteAnalyticsOverview,
  SiteAnalyticsPageRow,
  SiteAnalyticsTimeseriesPoint,
} from '@/types'

export type SiteAnalyticsRange = {
  from: string
  to: string
}

function qs(range: SiteAnalyticsRange, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ from: range.from, to: range.to, ...extra })
  return params.toString()
}

export const siteAnalyticsService = {
  overview(range: SiteAnalyticsRange) {
    return apiFetchData<SiteAnalyticsOverview>(`/root/website-analytics/overview?${qs(range)}`)
  },

  pages(range: SiteAnalyticsRange) {
    return apiFetchData<SiteAnalyticsPageRow[]>(`/root/website-analytics/pages?${qs(range)}`)
  },

  timeseries(range: SiteAnalyticsRange) {
    return apiFetchData<SiteAnalyticsTimeseriesPoint[]>(
      `/root/website-analytics/timeseries?${qs(range)}`,
    )
  },

  heatmap(range: SiteAnalyticsRange, path: string) {
    return apiFetchData<SiteAnalyticsHeatmap>(
      `/root/website-analytics/heatmap?${qs(range, { path })}`,
    )
  },
}
