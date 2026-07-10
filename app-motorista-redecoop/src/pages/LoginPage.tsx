import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useLoading } from '@/contexts/LoadingContext'
import { ApiError } from '@/lib/api'
import { formatCpf, stripCpf } from '@/lib/travel'

export function LoginPage() {
  const { login } = useAuth()
  const { show, hide } = useLoading()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ username: false, password: false })

  const cpfDigits = stripCpf(username)
  const usernameInvalid = touched.username && cpfDigits.length < 11
  const passwordInvalid = touched.password && password.length < 6

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ username: true, password: true })

    if (cpfDigits.length < 11 || password.length < 6) {
      toast.error('Por favor, preencha todos os campos corretamente.')
      return
    }

    show()
    try {
      await login({ username: cpfDigits, password })
      toast.success('Login realizado com sucesso!')
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError && err.status) {
        toast.error(err.message)
      } else if (err instanceof Error) {
        toast.error(err.message || 'Ocorreu um erro ao realizar o login.')
      } else {
        toast.error('Ocorreu um erro ao realizar o login.')
      }
    } finally {
      hide()
    }
  }

  return (
    <div className="gradient-hero min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px] rounded-2xl bg-white shadow-2xl shadow-black/15 overflow-hidden">
        <div className="app-stripe-bar">
          <div className="app-stripe-bar__green" />
          <div className="app-stripe-bar__yellow" />
          <div className="app-stripe-bar__mint" />
        </div>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <img
              src="/assets/imgs/logo.png"
              alt="REDE COOP Logo"
              className="w-[min(150px,45vw)] h-auto mx-auto mb-3"
            />
            <p className="text-sm text-grey-dark leading-relaxed">
              Acesse com seu CPF e senha para gerenciar suas viagens.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="CPF"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(formatCpf(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="username"
              error={usernameInvalid ? 'O CPF é obrigatório e deve ser válido.' : undefined}
            />

            <Input
              label="Senha"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              error={
                passwordInvalid
                  ? 'A senha é obrigatória e deve ter no mínimo 6 caracteres.'
                  : undefined
              }
            />

            <Button type="submit" fullWidth className="mt-2">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
