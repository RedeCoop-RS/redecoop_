import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/aguardando', label: 'Aguardando', icon: 'schedule' },
  { to: '/finalizadas', label: 'Finalizadas', icon: 'check_circle' },
] as const

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  function isActive(path: string) {
    return location.pathname === path
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      <div className="app-stripe-bar">
        <div className="app-stripe-bar__green" />
        <div className="app-stripe-bar__yellow" />
        <div className="app-stripe-bar__mint" />
      </div>

      <div className="grid grid-cols-4 max-w-3xl mx-auto">
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-[10px] font-semibold transition-smooth ${
                active ? 'text-green' : 'text-grey-dark hover:text-green'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`material-icons text-[1.35rem] ${active ? 'text-green' : ''}`}
                aria-hidden="true"
              >
                {icon}
              </span>
              <span className="leading-tight text-center px-0.5">{label}</span>
              {active && (
                <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+6px)] w-1 h-1 rounded-full bg-green" />
              )}
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-[10px] font-semibold text-red hover:bg-red/5 transition-smooth"
        >
          <span className="material-icons text-[1.35rem]" aria-hidden="true">
            logout
          </span>
          <span className="leading-tight">Sair</span>
        </button>
      </div>
    </nav>
  )
}
