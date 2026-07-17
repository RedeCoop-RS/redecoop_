import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Footer } from '@/components/layout/Footer'
import { Seo } from '@/components/Seo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cooperativeService } from '@/services/cooperative.service'
import { locationService } from '@/services/location.service'
import type { City, Cooperative } from '@/types'

export function CompleteRegistrationPage() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [valid, setValid] = useState<boolean | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [logo, setLogo] = useState<File | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    fantasyName: '',
    description: '',
    cnpj: '',
    website: '',
    password: '',
    maleAssociates: 0,
    femaleAssociates: 0,
    phone: '',
    instagram: '',
    facebook: '',
    street: '',
    cep: '',
    number: '',
    neighborhood: '',
    complement: '',
    cityId: 0,
    serviceCityIds: [] as number[],
  })

  useEffect(() => {
    if (!token) return
    cooperativeService
      .verifyToken(token)
      .then((coop: Cooperative) => {
        setValid(true)
        setForm((f) => ({
          ...f,
          companyName: coop.companyName ?? '',
          fantasyName: coop.fantasyName ?? '',
          cnpj: coop.cnpj ?? '',
        }))
      })
      .catch(() => setValid(false))
    locationService.getCitiesByState(43).then(setCities).catch(() => {})
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      setStep(step + 1)
      return
    }

    if (!token) return
    setLoading(true)
    try {
      const fd = new FormData()
      if (logo) fd.append('img', logo)
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'serviceCityIds' && Array.isArray(val)) {
          val.forEach((id) => fd.append('serviceCityIds[]', String(id)))
        } else if (key !== 'serviceCityIds') {
          fd.append(key, String(val))
        }
      })
      await cooperativeService.completeRegistration(token, fd)
      toast.success('Cadastro completado com sucesso!')
    } catch {
      toast.error('Erro ao completar cadastro.')
    } finally {
      setLoading(false)
    }
  }

  if (valid === null) {
    return <div className="py-32 text-center text-grey">Verificando token...</div>
  }

  if (valid === false) {
    return (
      <>
        <div className="py-32 text-center px-4">
          <h1 className="text-2xl font-bold text-red">Token inválido ou expirado</h1>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Seo title="Completar Cadastro" noindex />
      <section className="min-h-screen bg-section-mist py-16 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-10">
            <img src="/assets/imgs/logo.png" alt="RedeCoop" className="h-12 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-green">Completar Cadastro</h1>
            <p className="text-sm text-grey mt-2">Etapa {step} de 3</p>
            <div className="flex gap-2 justify-center mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-16 rounded-full ${s <= step ? 'bg-green' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="text-sm font-medium text-grey-dark">Logo da cooperativa</label>
                  <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} className="mt-1.5 w-full text-sm" />
                </div>
                <Input label="Razão social" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                <Input label="Nome fantasia" required value={form.fantasyName} onChange={(e) => setForm({ ...form, fantasyName: e.target.value })} />
                <Input label="CNPJ" required value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-grey-dark">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Associados (M)" type="number" value={form.maleAssociates} onChange={(e) => setForm({ ...form, maleAssociates: Number(e.target.value) })} />
                  <Input label="Associadas (F)" type="number" value={form.femaleAssociates} onChange={(e) => setForm({ ...form, femaleAssociates: Number(e.target.value) })} />
                </div>
                <Input label="Senha" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </>
            )}

            {step === 2 && (
              <>
                <Input label="Telefone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input label="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                <Input label="Facebook" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
              </>
            )}

            {step === 3 && (
              <>
                <Input label="CEP" required value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
                <Input label="Rua" required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Número" required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  <Input label="Bairro" required value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                </div>
                <Input label="Complemento" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                <div>
                  <label className="text-sm font-medium text-grey-dark">Cidade</label>
                  <select
                    required
                    value={form.cityId}
                    onChange={(e) => setForm({ ...form, cityId: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  >
                    <option value={0}>Selecione...</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>
              )}
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Salvando...' : step < 3 ? 'Próximo' : 'Finalizar cadastro'}
              </Button>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </>
  )
}
