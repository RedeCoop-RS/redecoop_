import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  panelClassName?: string
  bodyClassName?: string
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, children, size = 'md', panelClassName = '', bodyClassName = '' }: ModalProps) {
  const [backdropReady, setBackdropReady] = useState(false)

  useEffect(() => {
    if (!open) {
      setBackdropReady(false)
      return
    }

    const timer = window.setTimeout(() => setBackdropReady(true), 500)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] modal-shell flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{ pointerEvents: backdropReady ? 'auto' : 'none' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`modal-panel relative w-full ${sizes[size]} max-h-[90vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col ${panelClassName}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-grey hover:bg-gray-100 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {!title && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full p-2 text-grey hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            )}
            <div className={`modal-panel__body flex-1 min-h-0 overflow-y-auto p-6 ${bodyClassName}`}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
