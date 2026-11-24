import { Info, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

export interface ConfirmRecipient {
  name: string
  email: string
  kind?: 'cooperative' | 'buyer'
}

interface ConfirmModalProps {
  title: string
  message: string
  recipients?: ConfirmRecipient[]
  omitted?: string[]
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

const kindLabel = (kind?: ConfirmRecipient['kind']) => {
  if (kind === 'buyer') return 'Instituição'
  if (kind === 'cooperative') return 'Cooperativa'
  return null
}

export function ConfirmModal({
  title,
  message,
  recipients = [],
  omitted = [],
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
      size={recipients.length ? 'md' : 'sm'}
      panelClassName="confirm-modal"
      bodyClassName="confirm-modal__body"
    >
      <div className={`confirm-modal__lead confirm-modal__lead--${variant}`}>
        <span className="confirm-modal__icon" aria-hidden="true">
          {variant === 'danger' ? <TriangleAlert size={20} /> : <Info size={20} />}
        </span>
        <p className="confirm-modal__message">{message}</p>
      </div>
      {recipients.length > 0 && (
        <ul className="confirm-modal__people">
          {recipients.map((recipient) => {
            const role = kindLabel(recipient.kind)
            return (
              <li key={`${recipient.kind ?? 'person'}-${recipient.email}`} className="confirm-modal__person">
                <div className="confirm-modal__person-top">
                  <p className="confirm-modal__person-name">{recipient.name}</p>
                  {role && <span className="confirm-modal__person-kind">{role}</span>}
                </div>
                <p className="confirm-modal__person-email">{recipient.email}</p>
              </li>
            )
          })}
        </ul>
      )}
      {omitted.length > 0 && (
        <p className="confirm-modal__omitted">Sem e-mail, não recebem: {omitted.join(', ')}.</p>
      )}
      <div className="confirm-modal__footer">
        <Button variant="outline" className="confirm-modal__cancel" onClick={onCancel}>
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
      <div className="confirm-modal__lead confirm-modal__lead--primary">
        <span className="confirm-modal__icon" aria-hidden="true">
          <Info size={20} />
        </span>
        <p className="confirm-modal__message">{message}</p>
      </div>
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
