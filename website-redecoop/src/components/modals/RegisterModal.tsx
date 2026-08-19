import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordField } from '@/components/ui/PasswordField'
import { useModal } from '@/contexts/ModalContext'
import { authService } from '@/services/auth.service'
import { locationService } from '@/services/location.service'
import { isPasswordValid } from '@/lib/password'
import { ApiError } from '@/lib/api'
import type { City } from '@/types'

export function RegisterModal() {
  const { modal, openModal, closeModal } = useModal()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'PRIVADO' as 'PRIVADO' | 'PUBLICO',
    address: '',
    cep: '',
    number: '',
    cityId: '' as number | '',
    neighborhood: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    locationService
      .getCitiesByState(43)
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch(() => {
        setCities([])
        toast.error('Não foi possível carregar as cidades. Tente novamente.')
      })
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (step === 2 && !form.cityId) {
      toast.error('Selecione a cidade.')
      return
    }
    if (step < 3) {
      setStep(step + 1)
      return
    }

    if (!form.cityId) {
      toast.error('Selecione a cidade.')
      setStep(2)
      return
    }

    if (!isPasswordValid(form.password)) {
      toast.error('Senha fraca: use letras maiúsculas, minúsculas e número ou símbolo.')
      return
    }

    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await authService.registerVisitant({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        address: form.address,
        cep: form.cep,
        number: form.number,
        cityId: form.cityId,
        neighborhood: form.neighborhood,
        type: form.type,
      })
      toast.success('Cadastro realizado! Faça login para continuar.')
      openModal('login')
      setStep(1)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao cadastrar. Verifique os dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={modal.type === 'register'} onClose={closeModal} title={`Cadastro — Etapa ${step}/3`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <Input label="Nome completo" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="E-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div>
              <label className="text-sm font-medium text-grey-dark">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'PRIVADO' | 'PUBLICO' })}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              >
                <option value="PRIVADO">Pessoa física</option>
                <option value="PUBLICO">Pessoa jurídica</option>
              </select>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Input label="Endereço" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="CEP" required value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              <Input label="Número" required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <Input label="Bairro" required value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
            <div>
              <label className="text-sm font-medium text-grey-dark">Cidade</label>
              <select
                required
                value={form.cityId}
                onChange={(e) =>
                  setForm({ ...form, cityId: e.target.value ? Number(e.target.value) : '' })
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              >
                <option value="">Selecione...</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <PasswordField
              label="Senha"
              required
              value={form.password}
              onChange={(password) => setForm({ ...form, password })}
            />
            <Input
              label="Confirmar senha"
              type="password"
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              error={
                form.confirmPassword && form.password !== form.confirmPassword
                  ? 'As senhas não coincidem.'
                  : undefined
              }
            />
          </>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Cadastrando...' : step < 3 ? 'Próximo' : 'Cadastrar'}
          </Button>
        </div>

        <p className="text-center text-sm text-grey">
          Já tem conta?{' '}
          <button type="button" onClick={() => openModal('login')} className="text-green font-semibold hover:underline">
            Entrar
          </button>
        </p>
      </form>
    </Modal>
  )
}
