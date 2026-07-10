import { apiFetchData } from '@/lib/api'
import type { City, State } from '@/types'

export const locationService = {
  getStates() {
    return apiFetchData<State[]>('/state/list')
  },

  getCitiesByState(stateId: number) {
    return apiFetchData<City[]>(`/city/find-by-state/${stateId}`)
  },

  searchCity(query: string) {
    return apiFetchData<City[]>(`/city/search?q=${encodeURIComponent(query)}`)
  },
}
