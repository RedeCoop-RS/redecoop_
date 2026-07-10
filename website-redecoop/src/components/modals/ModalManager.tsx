import { useModal } from '@/contexts/ModalContext'
import { ChooseLoginModal } from './ChooseLoginModal'
import { LoginModal } from './LoginModal'
import { RegisterModal } from './RegisterModal'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { TakePartModal } from './TakePartModal'

export function ModalManager() {
  const { modal } = useModal()

  switch (modal.type) {
    case 'choose-login':
      return <ChooseLoginModal />
    case 'login':
      return <LoginModal />
    case 'register':
      return <RegisterModal />
    case 'forgot-password':
      return <ForgotPasswordModal />
    case 'reset-password':
      return <ResetPasswordModal />
    case 'take-part':
      return <TakePartModal />
    default:
      return null
  }
}
