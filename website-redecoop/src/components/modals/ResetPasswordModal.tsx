import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useModal } from '@/contexts/ModalContext'
import { authService } from '@/services/auth.service'

export function ResetPasswordModal() {
  const { modal, openModal, closeModal } = useModal()
  const email = (modal.props?.email as string) ?? ''
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
    } catch {
      toast.error('Erro ao redefinir senha.')
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
        <Input
          label="Nova senha"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </Button>
      </form>
    </Modal>
  )
}
