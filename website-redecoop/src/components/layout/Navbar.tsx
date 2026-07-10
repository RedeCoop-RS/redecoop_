import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import '@/styles/navbar.css'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/blog', label: 'Blog' },
  { to: '/historia', label: 'Nossa História' },
  { to: '/governanca', label: 'Governança' },
  { to: '/cooperativismo-de-plataforma', label: 'Cooperativismo de plataforma' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/contato', label: 'Contato' },
]

export function Navbar() {
  const { pathname } = useLocation()
  const { user, isLoggedIn, logout } = useAuth()
  const { openModal } = useModal()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const [navbarOffset, setNavbarOffset] = useState(60)

  const isActive = (path: string) => {
    const base = path.split('#')[0]
    return base === '/' ? pathname === '/' : pathname.startsWith(base)
  }

  const linkClass = (path: string) =>
    `site-navbar__link transition-smooth ${isActive(path) ? 'site-navbar__link--active' : ''}`

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const syncOffset = () => setNavbarOffset(bar.getBoundingClientRect().height)
    syncOffset()

    const observer = new ResizeObserver(syncOffset)
    observer.observe(bar)
    window.addEventListener('resize', syncOffset)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncOffset)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header className="site-navbar-wrap">
      <div className={`site-navbar ${mobileOpen ? 'site-navbar--expanded' : ''}`}>
        <div className="site-navbar__bar" ref={barRef}>
          <nav className="site-navbar__inner">
            <Link to="/" className="relative z-10 shrink-0" aria-label="RedeCoop RS — página inicial">
              <img
                src="/assets/imgs/logo.png"
                alt="RedeCoop RS"
                width={160}
                height={40}
                decoding="async"
                fetchPriority="high"
                className="h-9 w-auto md:h-10"
              />
            </Link>

            <div className="site-navbar__links">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} className={linkClass(link.to)}>
                  {link.label}
                </Link>
              ))}
              {isLoggedIn && (
                <Link to="/cooperativas" className={linkClass('/cooperativas')}>
                  Cooperativas
                </Link>
              )}
            </div>

            <div className="site-navbar__actions">
              {!isLoggedIn ? (
                <button
                  onClick={() => openModal('choose-login')}
                  className="site-navbar__auth transition-smooth"
                >
                  <User size={18} />
                  Entrar
                </button>
              ) : (
                <div className="site-navbar__user-wrap">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="site-navbar__auth transition-smooth"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                  >
                    {user?.visitant?.name ?? user?.cooperative?.fantasyName ?? user?.cooperative?.companyName ?? 'Usuário'}
                    <ChevronDown size={16} />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="site-navbar__user-menu"
                        role="menu"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { logout(); setUserMenuOpen(false) }}
                          className="site-navbar__user-menu-btn transition-smooth"
                        >
                          <LogOut size={16} />
                          Sair
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <button
              className="site-navbar__menu-btn transition-smooth"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </nav>

          <div className="home-stripe-bar site-navbar__stripe" aria-hidden="true">
            <span className="home-stripe-bar__green" />
            <span className="home-stripe-bar__yellow" />
            <span className="home-stripe-bar__mint" />
          </div>
        </div>

        {mobileOpen && (
          <div
            className="site-navbar__mobile-shell lg:hidden"
            style={{ '--site-navbar-offset': `${navbarOffset}px` } as CSSProperties}
          >
            <button
              type="button"
              className="site-navbar__backdrop"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="site-navbar__mobile">
              <div className="site-navbar__mobile-inner">
                <nav className="site-navbar__mobile-nav" aria-label="Menu principal">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`site-navbar__mobile-link ${isActive(link.to) ? 'site-navbar__mobile-link--active' : ''}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {isLoggedIn && (
                    <Link
                      to="/cooperativas"
                      onClick={() => setMobileOpen(false)}
                      className={`site-navbar__mobile-link ${isActive('/cooperativas') ? 'site-navbar__mobile-link--active' : ''}`}
                    >
                      Cooperativas
                    </Link>
                  )}
                </nav>

                <div className="site-navbar__mobile-footer">
                  {isLoggedIn ? (
                    <div className="site-navbar__mobile-user">
                      <div className="site-navbar__mobile-user-info">
                        <p className="site-navbar__mobile-user-label">Logado como</p>
                        <p className="site-navbar__mobile-user-name">
                          {user?.visitant?.name ?? user?.cooperative?.fantasyName ?? user?.cooperative?.companyName ?? 'Usuário'}
                        </p>
                      </div>
                      <button
                        onClick={() => { logout(); setMobileOpen(false) }}
                        className="site-navbar__mobile-logout transition-smooth"
                      >
                        <LogOut size={16} />
                        Sair
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { openModal('choose-login'); setMobileOpen(false) }}
                      className="site-navbar__mobile-enter transition-smooth"
                    >
                      <User size={18} />
                      Entrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
