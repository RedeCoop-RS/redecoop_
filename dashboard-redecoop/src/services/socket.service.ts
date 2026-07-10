import { io, type Socket } from 'socket.io-client'
import { environment } from '@/config/environment'
import { authService } from '@/services/auth.service'

type EventCallback = (data: unknown) => void

class SocketService {
  private socket: Socket | null = null
  private listeners = new Map<string, Set<EventCallback>>()
  private connectCallbacks = new Set<() => void>()

  connect() {
    const token = authService.getToken()
    if (!token) return

    if (this.socket?.connected) return

    this.socket?.disconnect()

    this.socket = io(environment.ws, {
      transports: ['websocket'],
      auth: { token },
    })

    this.socket.on('connect', () => {
      this.connectCallbacks.forEach((cb) => cb())
    })

    this.socket.on('exception', (data: { message?: string }) => {
      if (data?.message) {
        window.dispatchEvent(new CustomEvent('socket:exception', { detail: data.message }))
      }
    })

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.on(event, cb)
      })
    })
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  onConnect(cb: () => void) {
    this.connectCallbacks.add(cb)
    return () => this.connectCallbacks.delete(cb)
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data)
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(callback)
    this.socket?.on(event, callback)
    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback)
    this.socket?.off(event, callback)
  }

  enableNotifications() {
    this.emit('listenNotification')
  }

  enableAdminChatAlerts() {
    this.emit('listenAdminChatAlerts', {})
  }
}

export const socketService = new SocketService()

export const chatService = {
  joinConversation(conversationId: number) {
    socketService.emit('joinConversation', { conversationId })
  },

  leaveConversation(conversationId: number) {
    socketService.emit('leaveConversation', { conversationId })
  },

  sendMessage(content: string, conversationId: number) {
    socketService.emit('sendMessage', { content, conversationId })
  },

  markAsRead(messageId: number) {
    socketService.emit('markAsRead', { messageId })
  },

  editMessage(messageId: number, conversationId: number, newContent: string) {
    socketService.emit('editMessage', { messageId, conversationId, newContent })
  },

  markAsApproved(messageId: number, conversationId: number, approved: boolean) {
    socketService.emit('markAsApproved', { conversationId, messageId, approved })
  },

  markAsReproved(messageId: number, conversationId: number) {
    socketService.emit('markAsReproved', { conversationId, messageId })
  },

  onNewMessage(cb: EventCallback) {
    return socketService.on('newMessage', cb)
  },

  onMessageApproved(cb: EventCallback) {
    return socketService.on('messageApproved', cb)
  },

  onMessageEdited(cb: EventCallback) {
    return socketService.on('editedMessage', cb)
  },

  onNotification(cb: EventCallback) {
    return socketService.on('notification', cb)
  },

  onAdminChatAlert(cb: EventCallback) {
    return socketService.on('adminChatAlert', cb)
  },
}
