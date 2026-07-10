import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { requestService } from '@/services/misc.service'
import { UserRole } from '@/types'

interface PendingRequestsContextValue {
  count: number
  refresh: () => Promise<void>
}

const PendingRequestsContext = createContext<PendingRequestsContextValue>({
  count: 0,
  refresh: async () => {},
})

export function PendingRequestsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (user?.role !== UserRole.ADMIN) {
      setCount(0)
      return
    }

    try {
      const result = await requestService.list(1, 1)
      setCount(result.total)
    } catch {
      setCount(0)
    }
  }, [user?.role])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <PendingRequestsContext.Provider value={{ count, refresh }}>
      {children}
    </PendingRequestsContext.Provider>
  )
}

export function usePendingRequests() {
  return useContext(PendingRequestsContext)
}
