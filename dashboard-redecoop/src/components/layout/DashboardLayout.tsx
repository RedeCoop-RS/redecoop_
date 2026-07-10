import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { NotificationsPanel } from './NotificationsPanel'
import { useSocket } from '@/contexts/SocketContext'

export function DashboardLayout() {
  const location = useLocation()
  const { notifications, unreadCount, refreshNotifications, markAsRead } = useSocket()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (notificationsOpen) refreshNotifications()
  }, [notificationsOpen, refreshNotifications])

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
        onMarkAsRead={markAsRead}
      />
    </div>
  )
}
