import { apiFetch, unwrapData } from '@/lib/api'
import type { Travel } from '@/types'

export async function getDriverTravels(): Promise<Travel[]> {
  const response = await apiFetch<unknown>('/driver/my-travels')
  return unwrapData<Travel[]>(response) ?? []
}

export async function getTotalTravelsFinished(): Promise<number> {
  const response = await apiFetch<{ data: number }>('/driver/total-travels-finished')
  return response.data
}

export async function startTravel(travelId: number): Promise<void> {
  await apiFetch(`/driver/start-travel/${travelId}`, { method: 'POST', body: '{}' })
}

export async function markArrivalRoute(travelRouteId: number): Promise<void> {
  await apiFetch(`/driver/mark-arrival-route/${travelRouteId}`, {
    method: 'POST',
    body: '{}',
  })
}

export async function attachInRoute(travelRouteId: number, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  await apiFetch(`/driver/attach-in-route/${travelRouteId}`, {
    method: 'POST',
    body: formData,
  })
}
