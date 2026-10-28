import { Bell, Mail, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NotifyBadge } from '@/components/ui/NotifyBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useMailboxUnread } from '@/contexts/MailboxUnreadContext'
import { UserMenu } from './UserMenu'

interface TopBarProps {
  onMenuClick: () => void
  onOpenNotifications: () => void
  unreadCount?: number
}

export function TopBar({
  onMenuClick,
  onOpenNotifications,
  unreadCount = 0,
}: TopBarProps) {
  const { isAdmin } = useAuth()
  const { count: mailboxUnread } = useMailboxUnread()

  return (
    <header className="dashboard-topbar">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-grey-dark hover:bg-gray-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden flex-1 lg:block" />

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            to="/admin/email"
            className="topbar-icon-btn topbar-icon-btn--notify"
            aria-label={mailboxUnread > 0 ? `E-mail, ${mailboxUnread} não lidos` : 'E-mail'}
          >
            <Mail size={18} />
            <NotifyBadge count={mailboxUnread} variant="floating" label="E-mails não lidos" />
          </Link>
        )}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="topbar-icon-btn topbar-icon-btn--notify"
          aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
        >
          <Bell size={18} />
          <NotifyBadge count={unreadCount} variant="floating" />
        </button>

        <div className="topbar-divider hidden sm:block" />

        <UserMenu />
      </div>
    </header>
  )
}
