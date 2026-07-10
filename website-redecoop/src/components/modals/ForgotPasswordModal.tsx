import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useModal } from '@/contexts/ModalContext'
import { authService } from '@/services/auth.service'

export function ForgotPasswordModal() {
  const { modal, openModal, closeModal } = useModal()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.resetPassword(email)
      toast.success('Código enviado para seu e-mail!')
      openModal('reset-password', { email })
    } catch {
      toast.error('Erro ao enviar código. Verifique o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={modal.type === 'forgot-password'} onClose={closeModal} title="Recuperar senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-grey-dark">
          Informe seu e-mail para receber o código de recuperação.
        </p>
        <Input
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Enviando...' : 'Enviar código'}
        </Button>
      </form>
    </Modal>
  )
}
