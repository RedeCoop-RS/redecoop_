import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ConfirmModal, AlertModal } from '@/components/modals/ConfirmModal'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface AlertOptions {
  title?: string
  message: string
}

interface ModalContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(
    null,
  )
  const [alertState, setAlertState] = useState<(AlertOptions & { open: boolean }) | null>(null)
  const confirmResolve = useRef<((v: boolean) => void) | null>(null)
  const alertResolve = useRef<(() => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolve.current = resolve
      setConfirmState({ ...options, open: true })
    })
  }, [])

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      alertResolve.current = resolve
      setAlertState({ ...options, open: true })
    })
  }, [])

  const closeConfirm = (result: boolean) => {
    setConfirmState(null)
    confirmResolve.current?.(result)
    confirmResolve.current = null
  }

  const closeAlert = () => {
    setAlertState(null)
    alertResolve.current?.()
    alertResolve.current = null
  }

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      {confirmState?.open && (
        <ConfirmModal
          title={confirmState.title ?? 'Confirmar'}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          variant={confirmState.variant}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}
      {alertState?.open && (
        <AlertModal
          title={alertState.title ?? 'Aviso'}
          message={alertState.message}
          onClose={closeAlert}
        />
      )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
