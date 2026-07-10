import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import toast from 'react-hot-toast'
import { categorizeTravels } from '@/lib/travel'
import { getDriverTravels } from '@/services/driver.service'
import type { Travel } from '@/types'

interface TravelsContextValue {
  loading: boolean
  inProgress: Travel[]
  awaiting: Travel[]
  completed: Travel[]
  refresh: () => Promise<void>
}

const TravelsContext = createContext<TravelsContextValue | null>(null)

export function TravelsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [travels, setTravels] = useState<Travel[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDriverTravels()
      setTravels(data)
    } catch {
      toast.error('Não foi possível carregar suas viagens.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const { inProgress, awaiting, completed } = useMemo(
    () => categorizeTravels(travels),
    [travels],
  )

  const value = useMemo(
    () => ({ loading, inProgress, awaiting, completed, refresh }),
    [loading, inProgress, awaiting, completed, refresh],
  )

  return <TravelsContext.Provider value={value}>{children}</TravelsContext.Provider>
}

export function useTravels() {
  const ctx = useContext(TravelsContext)
  if (!ctx) throw new Error('useTravels must be used within TravelsProvider')
  return ctx
}
