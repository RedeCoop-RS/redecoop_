import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { chatService, socketService } from '@/services/socket.service'
import { notificationService } from '@/services/misc.service'
import { normalizeNotification } from '@/lib/notification'
import type { Notification } from '@/types'
import { UserRole } from '@/types'

interface SocketContextValue {
  notifications: Notification[]
  unreadCount: number
  refreshNotifications: () => void
  markAsRead: (id: number) => Promise<void>
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshNotifications = useCallback(async () => {
    try {
      const [{ data }, unread] = await Promise.all([
        notificationService.list(1, 50),
        notificationService.countUnread(),
      ])
      const normalized = data.map((item) =>
        normalizeNotification(item as unknown as Record<string, unknown>),
      )
      setNotifications(normalized)
      setUnreadCount(typeof unread === 'number' ? unread : normalized.filter((n) => !n.read).length)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])

  const markAsRead = useCallback(
    async (id: number) => {
      await notificationService.markAsRead(id)
      await refreshNotifications()
    },
    [refreshNotifications],
  )

  useEffect(() => {
    if (!user || !authService.getToken()) {
      socketService.disconnect()
      return
    }

    socketService.connect()
    socketService.enableNotifications()

    if (user.role === UserRole.ADMIN) {
      socketService.enableAdminChatAlerts()
    }

    void refreshNotifications()

    const unsubNotification = chatService.onNotification(() => {
      refreshNotifications()
    })

    const unsubAdminAlert = chatService.onAdminChatAlert(() => {
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('RedeCoop — Nova mensagem admin')
      }
    })

    const onException = (e: Event) => {
      toast.error(String((e as CustomEvent).detail))
    }
    window.addEventListener('socket:exception', onException)

    const onAuthLogout = () => socketService.disconnect()
    window.addEventListener('auth:logout', onAuthLogout)

    return () => {
      unsubNotification()
      unsubAdminAlert()
      window.removeEventListener('socket:exception', onException)
      window.removeEventListener('auth:logout', onAuthLogout)
    }
  }, [user, refreshNotifications])

  return (
    <SocketContext.Provider
      value={{ notifications, unreadCount, refreshNotifications, markAsRead }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
