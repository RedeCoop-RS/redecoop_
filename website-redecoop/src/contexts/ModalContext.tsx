import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

export type ModalType =
  | 'choose-login'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'take-part'
  | null

interface ModalState {
  type: ModalType
  props?: Record<string, unknown>
}

interface ModalContextValue {
  modal: ModalState
  openModal: (type: ModalType, props?: Record<string, unknown>) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({ type: null })

  const openModal = useCallback((type: ModalType, props?: Record<string, unknown>) => {
    setModal({ type, props })
  }, [])

  const closeModal = useCallback(() => {
    setModal({ type: null })
  }, [])

  return (
    <ModalContext.Provider value={{ modal, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
