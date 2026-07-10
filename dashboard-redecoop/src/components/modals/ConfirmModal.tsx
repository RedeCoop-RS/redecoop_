import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      size="sm"
      panelClassName="confirm-modal"
      bodyClassName="confirm-modal__body"
    >
      <p className="confirm-modal__message">{message}</p>
      <div className="confirm-modal__divider" aria-hidden />
      <div className="confirm-modal__footer">
        <Button variant="ghost" className="confirm-modal__cancel" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          className="confirm-modal__confirm"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function AlertModal({
  title,
  message,
  onClose,
}: {
  title: string
  message: string
  onClose: () => void
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      panelClassName="confirm-modal"
      bodyClassName="confirm-modal__body"
    >
      <p className="confirm-modal__message">{message}</p>
      <div className="confirm-modal__divider" aria-hidden />
      <div className="confirm-modal__footer">
        <Button className="confirm-modal__confirm" onClick={onClose}>
          OK
        </Button>
      </div>
    </Modal>
  )
}

export function ShowImageModal({
  open,
  src,
  onClose,
}: {
  open: boolean
  src: string
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <img src={src} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />
    </Modal>
  )
}
