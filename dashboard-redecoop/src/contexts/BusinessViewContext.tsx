import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BusinessViewModal } from '@/components/business/BusinessViewModal'
import type { Business } from '@/types'

interface BusinessViewContextValue {
  viewBusiness: Business | null
  openBusinessView: (business: Business) => void
  openBusinessViewAndGoToList: (business: Business, listPath: string) => void
  closeBusinessView: () => void
}

const BusinessViewContext = createContext<BusinessViewContextValue | null>(null)

function BusinessViewModalHost() {
  const { viewBusiness, closeBusinessView } = useBusinessView()

  return (
    <BusinessViewModal
      open={!!viewBusiness}
      business={viewBusiness}
      onClose={closeBusinessView}
    />
  )
}

export function BusinessViewProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [viewBusiness, setViewBusiness] = useState<Business | null>(null)

  const openBusinessView = useCallback((business: Business) => {
    setViewBusiness(business)
  }, [])

  const openBusinessViewAndGoToList = useCallback(
    (business: Business, listPath: string) => {
      setViewBusiness(business)
      if (location.pathname !== listPath) {
        navigate(listPath)
      }
    },
    [location.pathname, navigate],
  )

  const closeBusinessView = useCallback(() => {
    setViewBusiness(null)
  }, [])

  return (
    <BusinessViewContext.Provider
      value={{
        viewBusiness,
        openBusinessView,
        openBusinessViewAndGoToList,
        closeBusinessView,
      }}
    >
      {children}
      <BusinessViewModalHost />
    </BusinessViewContext.Provider>
  )
}

export function useBusinessView() {
  const ctx = useContext(BusinessViewContext)
  if (!ctx) throw new Error('useBusinessView must be used within BusinessViewProvider')
  return ctx
}
