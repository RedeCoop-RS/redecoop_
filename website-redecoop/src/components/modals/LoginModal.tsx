import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useModal } from '@/contexts/ModalContext'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { ApiError } from '@/lib/api'

type LoginUserType = 'customer' | 'cooperative'

export function LoginModal() {
  const { modal, openModal, closeModal } = useModal()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const typeUser = (modal.props?.typeUser as LoginUserType) ?? 'customer'
  const onSuccess = modal.props?.onSuccess as (() => void) | undefined
  const redirectToCooperatives =
    typeUser === 'customer' || Boolean(modal.props?.redirectToCooperatives)

  const title = typeUser === 'cooperative' ? 'Acesso Cooperativa' : 'Acesso Consumidor'
  const description =
    typeUser === 'cooperative'
      ? 'Acesse o painel da cooperativa e utilize Coopfrete, Balcão de Negócios, Compras Coletivas e mais.'
      : 'Para acessar o catálogo completo e os contatos de todas as cooperativas da RedeCoop.'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await authService.login({ username: email, password })
      refresh()

      if (authService.handlePostLogin(response)) {
        closeModal()
        return
      }

      toast.success('Login realizado com sucesso!')
      closeModal()

      if (onSuccess) {
        onSuccess()
      } else if (redirectToCooperatives) {
        navigate('/cooperativas')
      }
    } catch (err) {
      let message = 'E-mail ou senha incorretos.'
      if (err instanceof ApiError) {
        message = err.message
      } else if (err instanceof TypeError) {
        message = 'Não foi possível conectar à API. Verifique se o backend está rodando (porta 3000).'
      }
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={modal.type === 'login'} onClose={closeModal} title={title}>
      <p className="text-sm text-grey-dark mb-5 leading-relaxed">{description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Senha"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={() => openModal('forgot-password')}
          className="text-sm text-green hover:underline"
        >
          Esqueceu a senha?
        </button>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Acessar'}
        </Button>

        <p className="text-center text-sm text-grey">
          {typeUser === 'customer' ? (
            <>
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => openModal('register')}
                className="text-green font-semibold hover:underline"
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              Ainda não faz parte?{' '}
              <Link
                to="/cooperativismo-de-plataforma#take-part"
                onClick={closeModal}
                className="text-green font-semibold hover:underline"
              >
                Chama a gente!
              </Link>
            </>
          )}
        </p>
      </form>
    </Modal>
  )
}
