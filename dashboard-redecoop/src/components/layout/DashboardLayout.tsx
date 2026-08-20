import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { NotificationsPanel } from './NotificationsPanel'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import {
  getNotificationPath,
  matchConversationId,
  parseNotificationMeta,
} from '@/lib/notification'
import { conversationService } from '@/services/product.service'
import type { Notification } from '@/types'

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notifications, unreadCount, refreshNotifications, dismissNotification } = useSocket()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (notificationsOpen) refreshNotifications()
  }, [notificationsOpen, refreshNotifications])

  async function handleNotificationClick(notification: Notification) {
    setNotificationsOpen(false)

    const meta = parseNotificationMeta(notification.message)
    let conversationId = meta.conversationId

    if (!conversationId && (notification.type === 'new_message' || meta.senderName)) {
      try {
        const result = await conversationService.list(1, 100)
        conversationId = matchConversationId(result.data, meta.senderName)
      } catch {
        conversationId = undefined
      }
    }

    const path = user
      ? getNotificationPath(user.role, notification, conversationId)
      : '/admin/mensagens'

    navigate(path)
    void dismissNotification(notification.id)
  }

  return (
    <div className="dashboard-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      <div className="dashboard-main">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
        />

        <main className="dashboard-content">
          <div className="dashboard-content__inner">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <NotificationsPanel
        open={notificationsOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onClose={() => setNotificationsOpen(false)}
        onOpen={handleNotificationClick}
      />
    </div>
  )
}
