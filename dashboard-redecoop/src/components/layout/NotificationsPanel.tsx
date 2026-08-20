import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { NotifyBadge } from '@/components/ui/NotifyBadge'
import {
  formatNotificationDate,
  formatNotificationMessage,
  getNotificationIcon,
  getNotificationLabel,
} from '@/lib/notification'
import type { Notification } from '@/types'

interface NotificationsPanelProps {
  open: boolean
  notifications: Notification[]
  unreadCount: number
  onClose: () => void
  onOpen: (notification: Notification) => void
}

export function NotificationsPanel({
  open,
  notifications,
  unreadCount,
  onClose,
  onOpen,
}: NotificationsPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="notifications-overlay"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="notifications-panel"
            aria-label="Notificações"
          >
            <div className="notifications-panel__header">
              <div className="notifications-panel__title-wrap">
                <div className="notifications-panel__icon">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="notifications-panel__title-row">
                    <h3 className="notifications-panel__title">Notificações</h3>
                    <NotifyBadge count={unreadCount} variant="inline" className="notify-badge--panel" />
                  </div>
                  <p className="notifications-panel__subtitle">
                    {unreadCount > 0
                      ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
                      : notifications.length === 0
                        ? 'Tudo em dia'
                        : 'Clique para abrir'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="notifications-panel__close"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="notifications-panel__body">
              {notifications.length === 0 ? (
                <div className="notifications-empty">
                  <div className="notifications-empty__icon">
                    <Bell size={28} />
                  </div>
                  <p className="notifications-empty__title">Nenhuma notificação</p>
                  <p className="notifications-empty__text">
                    Quando houver novidades, elas aparecem aqui.
                  </p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => onOpen(notification)}
                      className={`notification-card ${notification.read ? 'notification-card--read' : 'notification-card--unread'}`}
                    >
                      <div className="notification-card__icon">
                        <img
                          src={getNotificationIcon(notification.type)}
                          alt=""
                          width={22}
                          height={22}
                        />
                      </div>
                      <div className="notification-card__content">
                        <span className="notification-card__type">
                          {getNotificationLabel(notification.type)}
                        </span>
                        <div
                          className="notification-card__message"
                          dangerouslySetInnerHTML={{
                            __html: formatNotificationMessage(notification.message),
                          }}
                        />
                        <time className="notification-card__time" dateTime={notification.createdAt}>
                          {formatNotificationDate(notification.createdAt)}
                        </time>
                      </div>
                      {!notification.read && <span className="notification-card__dot" aria-hidden />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
