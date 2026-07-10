import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface LoadingContextValue {
  loading: boolean
  show: () => void
  hide: () => void
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false)

  const show = useCallback(() => setLoading(true), [])
  const hide = useCallback(() => setLoading(false), [])

  const value = useMemo(
    () => ({ loading, show, hide }),
    [loading, show, hide],
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {loading && (
        <div
          className="fixed inset-0 z-[100] bg-white/70 backdrop-blur-sm flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-label="Carregando"
        >
          <div className="app-spinner" />
        </div>
      )}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider')
  return ctx
}
