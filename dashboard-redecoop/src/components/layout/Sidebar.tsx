import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePendingRequests } from '@/contexts/PendingRequestsContext'
import { useSocket } from '@/contexts/SocketContext'
import { useMailboxUnread } from '@/contexts/MailboxUnreadContext'
import { NotifyBadge } from '@/components/ui/NotifyBadge'
import { getNavigation, isDivider, type NavItem } from '@/config/navigation'
import { UserMenu } from './UserMenu'

interface SidebarProps {
  onOpenNotifications: () => void
}

export function Sidebar({ onOpenNotifications }: SidebarProps) {
  const { user } = useAuth()
  const { count: pendingRequests } = usePendingRequests()
  const { unreadCount } = useSocket()
  const { count: mailboxUnread } = useMailboxUnread()
  const location = useLocation()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    const navigation = getNavigation(user.role)
    for (const item of navigation) {
      if (isDivider(item)) continue
      if (item.submenu?.some((sub) => location.pathname.startsWith(sub.url))) {
        setExpandedMenus((prev) =>
          prev.includes(item.name) ? prev : [...prev, item.name],
        )
        break
      }
    }
  }, [location.pathname, user])

  if (!user) return null

  const nav = getNavigation(user.role)

  const isActive = (url: string) => {
    if (!url) return false
    if (url.endsWith('/admin') || url.endsWith('/cooperativa')) {
      return location.pathname === url || location.pathname === `${url}/`
    }
    return location.pathname.startsWith(url)
  }

  const toggleSubmenu = (name: string) => {
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  }

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const active = hasSubmenu
      ? item.submenu!.some((s) => isActive(s.url))
      : isActive(item.url)

    if (item.action === 'notifications') {
      return (
        <button
          key={item.name}
          type="button"
          onClick={onOpenNotifications}
          className="dashboard-sidebar__link w-full"
        >
          <Icon size={22} className="dashboard-sidebar__icon" />
          <span className="dashboard-sidebar__text">{item.name}</span>
          <NotifyBadge count={unreadCount} />
        </button>
      )
    }

    if (hasSubmenu) {
      const expanded = expandedMenus.includes(item.name)
      return (
        <div key={item.name}>
          <button
            type="button"
            onClick={() => toggleSubmenu(item.name)}
            className={`dashboard-sidebar__link w-full ${active ? 'dashboard-sidebar__link--active' : ''}`}
          >
            <Icon size={22} className="dashboard-sidebar__icon" />
            <span className="dashboard-sidebar__text">{item.name}</span>
            <ChevronDown
              size={16}
              className={`dashboard-sidebar__chevron transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
          {expanded && (
            <div className="dashboard-sidebar__submenu">
              {item.submenu!.map((sub) => (
                <Link
                  key={sub.url}
                  to={sub.url}
                  className={`dashboard-sidebar__submenu-link ${isActive(sub.url) ? 'dashboard-sidebar__submenu-link--active' : ''}`}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.url}
        to={item.url}
        title={item.name}
        className={`dashboard-sidebar__link ${active ? 'dashboard-sidebar__link--active' : ''}`}
      >
        <Icon size={22} className="dashboard-sidebar__icon" />
        <span className="dashboard-sidebar__text">{item.name}</span>
        {item.url.includes('visitantes-e-solicitacoes') && pendingRequests > 0 && (
          <NotifyBadge count={pendingRequests} />
        )}
        {item.badge === 'mailbox' && <NotifyBadge count={mailboxUnread} label="E-mails não lidos" />}
      </Link>
    )
  }

  return (
    <>
      <aside
        className="dashboard-sidebar"
        onMouseLeave={(event) => {
          const active = document.activeElement
          if (active instanceof HTMLElement && event.currentTarget.contains(active)) {
            active.blur()
          }
        }}
      >
        <div className="dashboard-sidebar__brand">
          <Link to={user.role === 'ADMIN' ? '/admin' : '/cooperativa'} className="dashboard-sidebar__logo" title="RedeCoop">
            <img src="/assets/imgs/logo-text-white.svg" alt="RedeCoop" />
          </Link>
        </div>

        <nav className="dashboard-sidebar__nav">
          {nav.map((item, i) =>
            isDivider(item) ? (
              <div key={`divider-${i}`} className="dashboard-sidebar__divider" />
            ) : (
              renderItem(item)
            ),
          )}
        </nav>

        <div className="dashboard-sidebar__footer">
          <UserMenu />
        </div>
      </aside>
    </>
  )
}
