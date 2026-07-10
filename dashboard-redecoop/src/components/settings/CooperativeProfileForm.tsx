import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { PicturePicker } from '@/components/ui/PicturePicker'
import { EditEmailModal, EditPasswordModal } from '@/components/modals/CooperativeModals'
import { cooperativeService } from '@/services/cooperative.service'
import { locationService } from '@/services/misc.service'
import { environment } from '@/config/environment'
import { cleanText } from '@/lib/text'

const DEFAULT_SERVICE_STATE_ID = 43

type LocationCity = {
  id: number
  name: string
  stateId?: number
  corede?: string
  functional_region?: string
}

type StateOption = { id: number; name: string; uf?: string; abbreviation?: string }

function cityId(value: number | string) {
  return Number(value)
}

function sameCityId(a: number | string, b: number | string) {
  return cityId(a) === cityId(b)
}

function toLocationCity(c: {
  id: number | string
  name: string
  stateId?: number | string
  corede?: string
  functional_region?: string
}): LocationCity {
  return {
    id: cityId(c.id),
    name: c.name,
    stateId: c.stateId != null && c.stateId !== '' ? cityId(c.stateId) : undefined,
    corede: c.corede || undefined,
    functional_region: c.functional_region || undefined,
  }
}

function mergeSelectedCities(current: LocationCity[], incoming: LocationCity[]) {
  const map = new Map(current.map((c) => [c.id, c]))
  incoming.forEach((c) => map.set(c.id, { ...map.get(c.id), ...c, id: c.id, name: c.name }))
  return Array.from(map.values())
}

function isCitySelected(selected: LocationCity[], id: number | string) {
  return selected.some((c) => sameCityId(c.id, id))
}

function coredeSelectionStatus(
  corede: string,
  allCities: LocationCity[],
  selected: LocationCity[],
): 'none' | 'partial' | 'full' {
  const coredeCities = allCities.filter((c) => c.corede === corede)
  if (coredeCities.length === 0) return 'none'
  const selectedCount = coredeCities.filter((c) => isCitySelected(selected, c.id)).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === coredeCities.length) return 'full'
  return 'partial'
}

function stateLabel(s: StateOption) {
  return s.abbreviation ?? s.uf ?? s.name
}

function obscureEmail(email: string) {
  const [user, domain] = email.split('@')
  if (!domain) return email
  const obscuredUser =
    user.length > 2 ? user[0] + '*'.repeat(user.length - 2) + user[user.length - 1] : user[0] + '*'
  return `${obscuredUser}@${domain}`
}

export function CooperativeProfileForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [states, setStates] = useState<StateOption[]>([])
  const [cities, setCities] = useState<LocationCity[]>([])
  const [serviceCities, setServiceCities] = useState<LocationCity[]>([])
  const [selectedServiceCities, setSelectedServiceCities] = useState<LocationCity[]>([])
  const [addressCity, setAddressCity] = useState<LocationCity | null>(null)
  const [serviceCitySearch, setServiceCitySearch] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [existingImg, setExistingImg] = useState<string | undefined>()
  const [accessEmail, setAccessEmail] = useState('')
  const [isObscuredEmail, setIsObscuredEmail] = useState(true)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    fantasyName: '',
    description: '',
    cnpj: '',
    website: '',
    email: '',
    phone: '',
    instagram: '',
    facebook: '',
    stateId: '',
    cityId: '',
    cep: '',
    neighborhood: '',
    street: '',
    number: '',
    complement: '',
    maleAssociates: '0',
    femaleAssociates: '0',
    youngAssociates: '0',
    serviceStateId: String(DEFAULT_SERVICE_STATE_ID),
  })

  const loadProfile = useCallback(() => {
    setLoading(true)
    return cooperativeService
      .viewProfile()
      .then((data) => {
        setExistingImg(data.img ?? data.picture)
        setAccessEmail(data.user?.username ?? '')

        const deliveryCities = (data.cooperativeDeliveryCities ?? []).map((c) =>
          toLocationCity(c as LocationCity),
        )
        setSelectedServiceCities(deliveryCities)

        const coopCity = data.city?.id
          ? toLocationCity({
              id: data.city.id,
              name: data.city.name,
              stateId: data.city.stateId ?? data.city.state?.id,
              corede: data.city.corede,
              functional_region: data.city.functional_region,
            })
          : null
        setAddressCity(coopCity)

        const addressStateId = coopCity?.stateId ?? data.city?.stateId ?? data.city?.state?.id
        const serviceStateId = String(DEFAULT_SERVICE_STATE_ID)

        if (addressStateId) {
          locationService.citiesByState(addressStateId).then((res) => {
            setCities(res.map(toLocationCity))
          })
        }

        setForm({
          companyName: data.companyName ?? '',
          fantasyName: data.fantasyName ?? data.name ?? '',
          description: cleanText(data.description),
          cnpj: data.cnpj ?? '',
          website: data.website ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          instagram: data.instagram ?? '',
          facebook: data.facebook ?? '',
          stateId: addressStateId ? String(addressStateId) : '',
          cityId: data.cityId ? String(data.cityId) : data.city?.id ? String(data.city.id) : '',
          cep: data.cep ?? '',
          neighborhood: data.neighborhood ?? '',
          street: data.street ?? '',
          number: data.number ?? '',
          complement: data.complement ?? '',
          maleAssociates: String(data.maleAssociates ?? 0),
          femaleAssociates: String(data.femaleAssociates ?? 0),
          youngAssociates: String(data.youngAssociates ?? 0),
          serviceStateId,
        })

        locationService.citiesByState(Number(serviceStateId)).then((res) => {
          setServiceCities(res.map(toLocationCity))
        })
      })
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    locationService.states().then(setStates)
    loadProfile()
  }, [loadProfile])

  const loadCities = (stateId: string) => {
    if (!stateId) {
      setCities([])
      return
    }
    locationService.citiesByState(Number(stateId)).then((res) => {
      setCities(res.map(toLocationCity))
    })
  }

  const loadServiceCities = (stateId: string) => {
    if (!stateId) {
      setServiceCities([])
      return
    }
    locationService.citiesByState(Number(stateId)).then((res) => {
      setServiceCities(res.map(toLocationCity))
    })
  }

  const selectedCity = useMemo(() => {
    if (!form.cityId) return addressCity
    return cities.find((c) => sameCityId(c.id, form.cityId)) ?? addressCity
  }, [cities, form.cityId, addressCity])

  const availableCoredes = useMemo(() => {
    const coredes = serviceCities.map((c) => c.corede).filter((c): c is string => !!c)
    return [...new Set(coredes)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [serviceCities])

  const filteredServiceCities = useMemo(() => {
    const q = serviceCitySearch.trim().toLowerCase()
    const list = [...serviceCities].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    if (!q) return list
    return list.filter(
      (city) =>
        city.name.toLowerCase().includes(q) || (city.corede ?? '').toLowerCase().includes(q),
    )
  }, [serviceCities, serviceCitySearch])

  const handleCityChange = (cityIdValue: string) => {
    const city = cities.find((c) => sameCityId(c.id, cityIdValue))
    setForm((prev) => ({ ...prev, cityId: cityIdValue }))
    setAddressCity(city ?? null)
  }

  const toggleCorede = (corede: string) => {
    const coredeCities = serviceCities.filter((c) => c.corede === corede)
    const allSelected = coredeCities.every((c) => isCitySelected(selectedServiceCities, c.id))
    if (allSelected) {
      const removeIds = new Set(coredeCities.map((c) => c.id))
      setSelectedServiceCities((prev) => prev.filter((c) => !removeIds.has(c.id)))
    } else {
      setSelectedServiceCities((prev) => mergeSelectedCities(prev, coredeCities))
    }
  }

  const removeServiceCity = (id: number | string) => {
    setSelectedServiceCities((prev) => prev.filter((c) => !sameCityId(c.id, id)))
  }

  const toggleServiceCity = (city: LocationCity) => {
    setSelectedServiceCities((prev) =>
      isCitySelected(prev, city.id)
        ? prev.filter((c) => !sameCityId(c.id, city.id))
        : mergeSelectedCities(prev, [city]),
    )
  }

  useEffect(() => {
    if (!serviceCities.length) return
    setSelectedServiceCities((prev) => {
      if (!prev.length) return prev
      const enriched = serviceCities.filter((c) => isCitySelected(prev, c.id))
      return mergeSelectedCities(prev, enriched)
    })
  }, [serviceCities])

  const handleSave = async () => {
    if (selectedServiceCities.length === 0) {
      toast.error('Selecione pelo menos um município de atendimento!')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        cityId: Number(form.cityId),
        maleAssociates: Number(form.maleAssociates || 0),
        femaleAssociates: Number(form.femaleAssociates || 0),
        youngAssociates: Number(form.youngAssociates || 0),
        serviceCityIds: selectedServiceCities.map((c) => c.id).join(','),
      }
      if (logo) payload.img = logo

      await cooperativeService.updateProfile(payload)

      toast.success('Perfil alterado com sucesso')
      setLogo(null)
      await loadProfile()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
  }

  const displayedEmail = isObscuredEmail ? obscureEmail(accessEmail) : accessEmail

  return (
    <>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Coluna 1 — Perfil */}
          <div className="space-y-4">
            <PicturePicker
              existingSrc={existingImg ? `${environment.storageUrl}${existingImg}` : undefined}
              file={logo}
              onChange={setLogo}
            />
            <Input
              label="Razão social"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
            <Input
              label="Nome fantasia"
              value={form.fantasyName}
              onChange={(e) => setForm({ ...form, fantasyName: e.target.value })}
            />
            <Textarea
              label="Descrição"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição das atividades da cooperativa"
            />
            <Input
              label="CNPJ"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <Input
              label="Associados (homens)"
              type="number"
              min={0}
              value={form.maleAssociates}
              onChange={(e) => setForm({ ...form, maleAssociates: e.target.value })}
            />
            <Input
              label="Associados (mulheres)"
              type="number"
              min={0}
              value={form.femaleAssociates}
              onChange={(e) => setForm({ ...form, femaleAssociates: e.target.value })}
            />
            <Input
              label="Jovens associados"
              type="number"
              min={0}
              value={form.youngAssociates}
              onChange={(e) => setForm({ ...form, youngAssociates: e.target.value })}
            />
          </div>

          {/* Coluna 2 — Acesso, contato e regiões */}
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink">Acesso</h3>
              <div className="relative">
                <Input label="E-mail" value={displayedEmail} readOnly disabled />
                <button
                  type="button"
                  className="absolute right-3 top-[34px] text-grey-dark transition hover:text-ink"
                  onClick={() => setIsObscuredEmail((v) => !v)}
                  aria-label={isObscuredEmail ? 'Mostrar e-mail' : 'Ocultar e-mail'}
                >
                  {isObscuredEmail ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-green hover:underline"
                  onClick={() => setPasswordModalOpen(true)}
                >
                  Alterar senha
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-green hover:underline"
                  onClick={() => setEmailModalOpen(true)}
                >
                  Alterar e-mail
                </button>
              </div>
              <p className="mt-2 text-xs text-grey">
                *Dados de acesso serão alterados mesmo que não se salve as alterações.
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink">Contato</h3>
              <div className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="emaildecontato@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="Telefone"
                  placeholder="(51) 99999-9999"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                  label="Instagram"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                />
                <Input
                  label="Facebook"
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                />
              </div>
            </section>

            <section className="coops-edit-regions">
              <h3 className="mb-3 text-sm font-semibold text-ink">Regiões de atendimento</h3>
              <Select
                label="UF"
                value={form.serviceStateId}
                placeholder="Selecione..."
                options={states.map((s) => ({ value: s.id, label: s.name }))}
                onChange={(e) => {
                  const stateId = e.target.value
                  setForm({ ...form, serviceStateId: stateId })
                  setServiceCitySearch('')
                  loadServiceCities(stateId)
                }}
              />

              {selectedServiceCities.length > 0 && (
                <div className="coops-selected-cities coops-selected-cities--top">
                  <p className="coops-selected-cities__title">
                    Municípios selecionados ({selectedServiceCities.length})
                  </p>
                  <div className="coops-selected-cities__wrap">
                    {[...selectedServiceCities]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map((city) => (
                        <span key={city.id} className="coops-selected-cities__badge">
                          {city.name}
                          <button
                            type="button"
                            aria-label="Remover"
                            onClick={() => removeServiceCity(city.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {availableCoredes.length > 0 && (
                <div className="coops-corede-picker">
                  <p className="coops-corede-picker__label">Selecionar por COREDE</p>
                  <p className="coops-corede-picker__hint">
                    Clique para marcar ou desmarcar todos os municípios do COREDE.
                  </p>
                  <div className="coops-corede-picker__buttons">
                    {availableCoredes.map((corede) => {
                      const status = coredeSelectionStatus(corede, serviceCities, selectedServiceCities)
                      const total = serviceCities.filter((c) => c.corede === corede).length
                      const selectedCount = serviceCities.filter(
                        (c) => c.corede === corede && isCitySelected(selectedServiceCities, c.id),
                      ).length
                      const prefix = status === 'full' ? '✓' : status === 'partial' ? '◐' : '+'
                      return (
                        <button
                          key={corede}
                          type="button"
                          className={`coops-corede-picker__btn coops-corede-picker__btn--${status}`}
                          aria-pressed={status !== 'none'}
                          onClick={() => toggleCorede(corede)}
                        >
                          <span className="coops-corede-picker__prefix">{prefix}</span>
                          {corede}
                          {status === 'partial' && (
                            <span className="coops-corede-picker__count">
                              {selectedCount}/{total}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <p className="coops-edit-regions__hint">
                Informe os municípios/regiões que a cooperativa oferta e entrega alimentos.
              </p>

              <Input
                placeholder="Buscar município ou COREDE..."
                value={serviceCitySearch}
                onChange={(e) => setServiceCitySearch(e.target.value)}
              />

              <div className="coops-edit-regions__list dashboard-scroll">
                {serviceCities.length === 0 ? (
                  <p className="text-sm text-grey">Selecione um estado para listar cidades.</p>
                ) : filteredServiceCities.length === 0 ? (
                  <p className="text-sm text-grey">Nenhum município encontrado para esta busca.</p>
                ) : (
                  filteredServiceCities.map((city) => {
                    const selected = isCitySelected(selectedServiceCities, city.id)
                    return (
                      <label
                        key={city.id}
                        className={`coops-edit-regions__item${selected ? ' coops-edit-regions__item--selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleServiceCity(city)}
                        />
                        <span>
                          {city.name}
                          {city.corede && (
                            <span className="coops-edit-regions__corede">{city.corede}</span>
                          )}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </section>
          </div>

          {/* Coluna 3 — Endereço e salvar */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">Endereço</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <Select
                label="UF"
                className="sm:col-span-1"
                value={form.stateId}
                placeholder="Selecione..."
                options={states.map((s) => ({ value: s.id, label: stateLabel(s) }))}
                onChange={(e) => {
                  const stateId = e.target.value
                  setForm({ ...form, stateId, cityId: '' })
                  setAddressCity(null)
                  loadCities(stateId)
                }}
              />
              <Select
                label="Município"
                className="sm:col-span-3"
                value={form.cityId}
                placeholder="Selecione..."
                options={cities.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(e) => handleCityChange(e.target.value)}
              />
            </div>

            {selectedCity?.corede && (
              <div className="coops-corede-info">
                <div>
                  <span className="coops-corede-info__label">Corede</span>
                  <span>{selectedCity.corede}</span>
                </div>
                {selectedCity.functional_region && (
                  <div>
                    <span className="coops-corede-info__label">Região funcional</span>
                    <span>{selectedCity.functional_region}</span>
                  </div>
                )}
              </div>
            )}

            <Input
              label="CEP"
              value={form.cep}
              onChange={(e) => setForm({ ...form, cep: e.target.value })}
            />
            <Input
              label="Bairro"
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Rua"
                className="sm:col-span-2"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
              <Input
                label="Nº"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </div>
            <Input
              label="Complemento"
              value={form.complement}
              onChange={(e) => setForm({ ...form, complement: e.target.value })}
            />

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save size={16} />
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      </div>

      <EditEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSaved={() => {
          setEmailModalOpen(false)
          loadProfile()
        }}
      />
      <EditPasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSaved={() => setPasswordModalOpen(false)}
      />
    </>
  )
}
