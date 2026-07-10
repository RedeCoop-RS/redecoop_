import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const DESKTOP_LINKS = [
  { to: '/', label: 'Em andamento', icon: 'local_shipping' },
  { to: '/aguardando', label: 'Aguardando', icon: 'schedule' },
  { to: '/finalizadas', label: 'Finalizadas', icon: 'check_circle' },
] as const

export function Navbar() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function isActive(path: string) {
    return location.pathname === path
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div
          className="w-full max-w-3xl md:max-w-none mx-auto flex items-center justify-between px-4 md:px-8 lg:px-12"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <Link to="/" aria-label="Início" className="py-2">
            <img
              src="/assets/imgs/logo.png"
              alt="Redecoop"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Menu hambúrguer — apenas desktop */}
          <button
            type="button"
            aria-controls="app-menu"
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
            className="hidden md:inline-flex ml-auto shrink-0 min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)] items-center justify-center rounded-xl text-grey-dark hover:bg-green/5 hover:text-green transition-smooth"
          >
            <span className="material-icons text-[1.75rem]" aria-hidden="true">
              menu
            </span>
          </button>
        </div>
        <div className="app-stripe-bar">
          <div className="app-stripe-bar__green" />
          <div className="app-stripe-bar__yellow" />
          <div className="app-stripe-bar__mint" />
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] border-0 cursor-pointer"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="app-menu"
        className={`fixed top-0 right-0 z-[60] hidden md:flex h-full w-[min(320px,88vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-labelledby="app-menu-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <h2 id="app-menu-title" className="text-lg font-bold text-ink">
            Menu
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMenuOpen(false)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-grey-dark"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <nav className="flex flex-1 flex-col p-4">
          {DESKTOP_LINKS.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center min-h-[var(--touch-target-min)] px-3 rounded-xl text-base font-medium transition-smooth mb-1 ${
                isActive(to)
                  ? 'bg-green/10 text-green font-semibold'
                  : 'text-ink hover:bg-gray-50'
              }`}
            >
              <span className="material-icons mr-3 text-[1.25rem]" aria-hidden="true">
                {icon}
              </span>
              {label}
            </Link>
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center min-h-[var(--touch-target-min)] px-3 rounded-xl text-base font-medium text-red border-t border-gray-100 pt-4 mt-4 hover:bg-red/5 transition-smooth w-full text-left"
          >
            <span className="material-icons mr-3 text-[1.25rem]" aria-hidden="true">
              logout
            </span>
            Sair
          </button>
        </nav>
      </aside>
    </>
  )
}
