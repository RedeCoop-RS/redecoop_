import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { mailboxErrorMessage, mailboxService } from '@/services/mailbox.service'

interface MailboxUnreadValue {
  count: number
  setCount: (count: number) => void
  refresh: () => Promise<void>
}

const MailboxUnreadContext = createContext<MailboxUnreadValue | null>(null)

export function MailboxUnreadProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!isAdmin) return
    try {
      const result = await mailboxService.unread()
      setCount((previous) => {
        if (
          result.unread > previous &&
          previous > 0 &&
          document.hidden &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const title = result.unread === 1 ? 'Novo e-mail na RedeCoop' : 'Novos e-mails na RedeCoop'
          new Notification(title, {
            body: `Caixa de entrada: ${result.unread} não ${result.unread === 1 ? 'lida' : 'lidas'}.`,
          })
        }
        return result.unread
      })
    } catch (error) {
      if (mailboxErrorMessage(error).includes('401')) return
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) {
      setCount(0)
      return
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 40000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [isAdmin, refresh])

  const value = useMemo(() => ({ count, setCount, refresh }), [count, refresh])
  return <MailboxUnreadContext.Provider value={value}>{children}</MailboxUnreadContext.Provider>
}

export function useMailboxUnread() {
  const context = useContext(MailboxUnreadContext)
  if (!context) throw new Error('useMailboxUnread must be used within MailboxUnreadProvider')
  return context
}
