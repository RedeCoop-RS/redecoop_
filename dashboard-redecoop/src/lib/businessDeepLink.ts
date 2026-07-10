import type { Business } from '@/types'

const STORAGE_KEY = 'redecoop.openBusiness'

function sameBusinessId(a: unknown, b: number) {
  return Number(a) === b
}

export function stashOpenBusiness(business: Business) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(business))
  } catch {
    /* quota / private mode */
  }
}

function readFromSessionStorage(expectedId: number): Business | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const business = JSON.parse(raw) as Business
    return sameBusinessId(business?.id, expectedId) ? business : null
  } catch {
    return null
  }
}

export function peekOpenBusiness(expectedId: number): Business | null {
  return readFromSessionStorage(expectedId)
}

export function takeOpenBusiness(expectedId: number): Business | null {
  const business = readFromSessionStorage(expectedId)
  if (!business) return null

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }

  return business
}

export function clearOpenBusinessCache() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
