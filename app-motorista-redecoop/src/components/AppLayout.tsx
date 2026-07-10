import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { Navbar } from '@/components/Navbar'
import { TravelsProvider } from '@/contexts/TravelsContext'

export function AppLayout() {
  const location = useLocation()
  const isTravelDetail = location.pathname.startsWith('/viagem-em-andamento/')
  const showBottomNav = !isTravelDetail

  return (
    <TravelsProvider>
      <Navbar />
      <main
        className={showBottomNav ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-8' : ''}
      >
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </TravelsProvider>
  )
}
