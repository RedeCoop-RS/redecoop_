import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordField } from '@/components/ui/PasswordField'
import { useModal } from '@/contexts/ModalContext'
import { authService } from '@/services/auth.service'
import { ApiError } from '@/lib/api'
import { isPasswordValid } from '@/lib/password'

export function ResetPasswordModal() {
  const { modal, openModal, closeModal } = useModal()
  const email = (modal.props?.email as string) ?? ''
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isPasswordValid(password)) {
      toast.error('Senha fraca: use letras maiúsculas, minúsculas e número ou símbolo.')
      return
    }

    setLoading(true)
    try {
      const valid = await authService.verifyCode(code, email)
      if (!valid) {
        toast.error('Código inválido.')
        return
      }
      await authService.newPassword(password, code, email)
      toast.success('Senha alterada com sucesso!')
      openModal('login')
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { errors?: { password?: string } } | undefined
        const passwordError = data?.errors?.password
        toast.error(passwordError ?? err.message ?? 'Erro ao redefinir senha.')
      } else {
        toast.error('Erro ao redefinir senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={modal.type === 'reset-password'} onClose={closeModal} title="Nova senha">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Código recebido por e-mail"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <PasswordField
          label="Nova senha"
          required
          value={password}
          onChange={setPassword}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </Button>
      </form>
    </Modal>
  )
}
