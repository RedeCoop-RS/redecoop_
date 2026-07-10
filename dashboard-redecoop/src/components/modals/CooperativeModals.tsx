import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { PicturePicker } from '@/components/ui/PicturePicker'
import { cooperativeService, cooperativeLabel } from '@/services/cooperative.service'
import { conversationService } from '@/services/product.service'
import { locationService } from '@/services/misc.service'
import { environment } from '@/config/environment'
import { cleanText } from '@/lib/text'
import { CooperativeType, type Cooperative } from '@/types'

const COOP_TYPES = Object.values(CooperativeType)
const DEFAULT_SERVICE_STATE_ID = 43

type LocationCity = {
  id: number
  name: string
  stateId?: number
  corede?: string
  functional_region?: string
}

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

function totalAssociates(form: { maleAssociates: string; femaleAssociates: string; youngAssociates: string }) {
  return (
    Number(form.maleAssociates || 0) +
    Number(form.femaleAssociates || 0) +
    Number(form.youngAssociates || 0)
  )
}

export function CooperativeCreateModal({
  open,
  onClose,
  onSaved,
  initialValues,
  requestInfo,
  title = 'Cadastrar cooperativa',
  submitLabel = 'Cadastrar',
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  initialValues?: {
    companyName?: string
    fantasyName?: string
    email?: string
    phone?: string
    cnpj?: string
  }
  requestInfo?: {
    name: string
    cnpj: string
    address: string
    email: string
    phone: string
    createdAt?: string
  }
  title?: string
  submitLabel?: string
}) {
  const [form, setForm] = useState({
    companyName: '',
    fantasyName: '',
    email: '',
    phone: '',
    password: '',
    cnpj: '',
  })
  const [logo, setLogo] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      companyName: initialValues?.companyName ?? '',
      fantasyName: initialValues?.fantasyName ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      password: '',
      cnpj: initialValues?.cnpj ?? '',
    })
    setLogo(null)
  }, [open, initialValues])

  const save = async () => {
    setSaving(true)
    try {
      await cooperativeService.create({ ...form, img: logo ?? undefined })
      toast.success('Cooperativa criada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {requestInfo && (
        <div className="accept-request-preview">
          <p className="accept-request-preview__title">Dados da solicitação</p>
          <div className="accept-request-preview__grid">
            <div>
              <span>Cooperativa</span>
              <strong>{requestInfo.name}</strong>
            </div>
            <div>
              <span>CNPJ</span>
              <strong>{requestInfo.cnpj}</strong>
            </div>
            <div>
              <span>E-mail</span>
              <strong>{requestInfo.email}</strong>
            </div>
            <div>
              <span>Telefone</span>
              <strong>{requestInfo.phone}</strong>
            </div>
            <div className="accept-request-preview__full">
              <span>Endereço</span>
              <strong>{requestInfo.address}</strong>
            </div>
            {requestInfo.createdAt && (
              <div>
                <span>Solicitado em</span>
                <strong>{new Date(requestInfo.createdAt).toLocaleDateString('pt-BR')}</strong>
              </div>
            )}
          </div>
          <p className="accept-request-preview__hint">
            Complete a senha de acesso abaixo para cadastrar a cooperativa e aceitar a solicitação.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <PicturePicker file={logo} onChange={setLogo} />
        </div>
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
        <Input
          label="CNPJ"
          value={form.cnpj}
          onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
        />
        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Senha de acesso"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          {submitLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function CooperativeEditModal({
  open,
  cooperativeId,
  onClose,
  onSaved,
}: {
  open: boolean
  cooperativeId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [states, setStates] = useState<{ id: number; name: string }[]>([])
  const [cities, setCities] = useState<LocationCity[]>([])
  const [serviceCities, setServiceCities] = useState<LocationCity[]>([])
  const [selectedServiceCities, setSelectedServiceCities] = useState<LocationCity[]>([])
  const [addressCity, setAddressCity] = useState<LocationCity | null>(null)
  const [serviceCitySearch, setServiceCitySearch] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [existingImg, setExistingImg] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    fantasyName: '',
    email: '',
    emailLogin: '',
    phone: '',
    description: '',
    cnpj: '',
    stateId: '',
    cityId: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    cep: '',
    website: '',
    instagram: '',
    facebook: '',
    maleAssociates: '0',
    femaleAssociates: '0',
    youngAssociates: '0',
    type: '',
    DAP: '',
    serviceStateId: String(DEFAULT_SERVICE_STATE_ID),
  })

  useEffect(() => {
    if (!open || !cooperativeId) return

    setLogo(null)
    setCities([])
    setServiceCities([])
    setSelectedServiceCities([])
    setAddressCity(null)
    setServiceCitySearch('')
    setExistingImg(undefined)

    locationService.states().then(setStates)
    cooperativeService.view(cooperativeId).then((data) => {
      setExistingImg(data.img ?? data.picture)

      const deliveryCities = (data.cooperativeDeliveryCities ?? []).map((c) =>
        toLocationCity(c as LocationCity),
      )
      setSelectedServiceCities(deliveryCities)

      const coopCity = data.city?.id
        ? toLocationCity({
            id: data.city.id,
            name: data.city.name,
            stateId: data.city.stateId ?? data.city.state?.id,
            corede: (data.city as LocationCity).corede,
            functional_region: (data.city as LocationCity).functional_region,
          })
        : null
      setAddressCity(coopCity)

      const addressStateId = coopCity?.stateId ?? data.city?.stateId ?? data.city?.state?.id
      const serviceStateId =
        addressStateId ?? deliveryCities.find((c) => c.stateId)?.stateId ?? DEFAULT_SERVICE_STATE_ID

      if (addressStateId) {
        locationService.citiesByState(addressStateId).then((res) => {
          setCities(res.map(toLocationCity))
        })
      }

      setForm({
        companyName: data.companyName ?? '',
        fantasyName: data.fantasyName ?? data.name ?? '',
        email: data.email ?? '',
        emailLogin: data.user?.username ?? '',
        phone: data.phone ?? '',
        description: cleanText(data.description),
        cnpj: data.cnpj ?? '',
        stateId: addressStateId ? String(addressStateId) : '',
        cityId: data.cityId ? String(data.cityId) : data.city?.id ? String(data.city.id) : '',
        street: data.street ?? '',
        number: data.number ?? '',
        complement: data.complement ?? '',
        neighborhood: data.neighborhood ?? '',
        cep: data.cep ?? '',
        website: data.website ?? '',
        instagram: data.instagram ?? '',
        facebook: data.facebook ?? '',
        maleAssociates: String(data.maleAssociates ?? 0),
        femaleAssociates: String(data.femaleAssociates ?? 0),
        youngAssociates: String(data.youngAssociates ?? 0),
        type: data.type ?? '',
        DAP: data.DAP ?? '',
        serviceStateId: String(serviceStateId),
      })

      locationService.citiesByState(serviceStateId).then((res) => {
        setServiceCities(res.map(toLocationCity))
      })
    })
  }, [open, cooperativeId])

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
        city.name.toLowerCase().includes(q) ||
        (city.corede ?? '').toLowerCase().includes(q),
    )
  }, [serviceCities, serviceCitySearch])

  const handleCityChange = (cityIdValue: string) => {
    const city = cities.find((c) => sameCityId(c.id, cityIdValue))
    setForm((prev) => ({ ...prev, cityId: cityIdValue }))
    setAddressCity(city ?? null)
    if (!city?.stateId) return

    const stateId = String(city.stateId)
    setForm((prev) => ({ ...prev, cityId: cityIdValue, serviceStateId: stateId }))
    locationService.citiesByState(city.stateId).then((res) => {
      const loaded = res.map(toLocationCity)
      setServiceCities(loaded)
      if (city.corede) {
        const coredeCities = loaded.filter((c) => c.corede === city.corede)
        setSelectedServiceCities((prev) => mergeSelectedCities(prev, coredeCities))
      }
    })
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

  const associatesTotal = useMemo(() => totalAssociates(form), [form])

  const save = async () => {
    if (!cooperativeId) return
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
      await cooperativeService.update(cooperativeId, payload)
      toast.success('Cooperativa atualizada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar cooperativa" size="xl">
      <div className="space-y-6">
        <section>
          <PicturePicker
            existingSrc={existingImg ? `${environment.storageUrl}${existingImg}` : undefined}
            file={logo}
            onChange={setLogo}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
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
          <Input
            label="E-mail contato"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="E-mail login"
            type="email"
            value={form.emailLogin}
            onChange={(e) => setForm({ ...form, emailLogin: e.target.value })}
          />
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
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
          <Input label="Total associados" value={String(associatesTotal)} readOnly disabled />
        </section>

        <section>
          <Textarea
            label="Breve histórico"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Estado"
            value={form.stateId}
            placeholder="Selecione..."
            options={states.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(e) => {
              const stateId = e.target.value
              setForm({ ...form, stateId, cityId: '' })
              loadCities(stateId)
            }}
          />
          <Select
            label="Cidade"
            value={form.cityId}
            placeholder="Selecione..."
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => handleCityChange(e.target.value)}
          />
          {selectedCity?.corede && (
            <div className="coops-corede-info sm:col-span-2">
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
            label="Rua"
            className="sm:col-span-2"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
          />
          <Input
            label="Número"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
          />
          <Input
            label="Complemento"
            value={form.complement}
            onChange={(e) => setForm({ ...form, complement: e.target.value })}
          />
          <Input
            label="Bairro"
            value={form.neighborhood}
            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
          />
          <Input label="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
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
          <Select
            label="Tipo"
            value={form.type}
            placeholder="Selecione..."
            options={COOP_TYPES.map((t) => ({ value: t, label: t === 'CENTRAL' ? 'Central' : 'Singular' }))}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Input label="CAF (DAP)" value={form.DAP} onChange={(e) => setForm({ ...form, DAP: e.target.value })} />
        </section>

        <section className="coops-edit-regions">
          <p className="mb-3 text-sm font-semibold text-ink">Regiões de atendimento</p>
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
                      <button type="button" aria-label="Remover" onClick={() => removeServiceCity(city.id)}>
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
              <p className="coops-corede-picker__hint">Clique para marcar ou desmarcar todos os municípios do COREDE.</p>
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
                      {city.corede && <span className="coops-edit-regions__corede">{city.corede}</span>}
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          Salvar alterações
        </Button>
      </div>
    </Modal>
  )
}

export function CooperativeDetailModal({
  open,
  cooperativeId,
  onClose,
  onMessage,
}: {
  open: boolean
  cooperativeId: number | null
  onClose: () => void
  onMessage: (cooperativeId: number) => void
}) {
  const [coop, setCoop] = useState<Cooperative | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !cooperativeId) {
      setCoop(null)
      return
    }
    setLoading(true)
    cooperativeService
      .view(cooperativeId)
      .then(setCoop)
      .catch(() => toast.error('Erro ao carregar cooperativa'))
      .finally(() => setLoading(false))
  }, [open, cooperativeId])

  const img = coop?.img ?? coop?.picture
  const cityLabel = coop?.city
    ? `${coop.city.name}${coop.city.state?.abbreviation ? `/${coop.city.state.abbreviation}` : ''}`
    : '—'

  return (
    <Modal open={open} onClose={onClose} size="lg" panelClassName="coops-detail-modal">
      {loading ? (
        <div className="coops-detail-loading">
          <span className="coops-skeleton coops-skeleton--block" />
        </div>
      ) : coop ? (
        <>
          <div className="coops-detail-header">
            <img
              src={img ? `${environment.storageUrl}${img}` : '/assets/imgs/default-cooperative.png'}
              alt=""
              className="coops-detail-header__avatar"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = '/assets/imgs/default-cooperative.png'
              }}
            />
            <div>
              <h3 className="coops-detail-header__title">{coop.companyName ?? coop.name}</h3>
              {coop.fantasyName && <p className="coops-detail-header__subtitle">{coop.fantasyName}</p>}
              <span className={`badge ${coop.active !== false ? 'badge--green' : 'badge--red'}`}>
                {coop.active !== false ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          {cleanText(coop.description) && (
            <p className="coops-detail-desc">{cleanText(coop.description)}</p>
          )}

          <div className="coops-detail-section">
            <h4>Contato</h4>
            <ul>
              {coop.email && <li>{coop.email}</li>}
              {coop.phone && <li>{coop.phone}</li>}
              {coop.facebook && <li>{coop.facebook}</li>}
              {coop.instagram && <li>{coop.instagram}</li>}
              {!coop.email && !coop.phone && !coop.facebook && !coop.instagram && (
                <li className="text-grey">Sem informações de contato.</li>
              )}
            </ul>
          </div>

          <div className="coops-detail-section">
            <h4>Endereço</h4>
            <ul>
              <li>
                {[coop.street, coop.number].filter(Boolean).join(', ')}
                {coop.neighborhood ? ` — ${coop.neighborhood}` : ''}
                {cityLabel !== '—' ? ` — ${cityLabel}` : ''}
              </li>
              {coop.complement && <li>{coop.complement}</li>}
              {coop.cep && <li>CEP {coop.cep}</li>}
            </ul>
          </div>

          <div className="coops-detail-footer">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => onMessage(coop.id)}>
              <MessageCircle size={16} />
              Enviar mensagem
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  )
}

export function ChangePasswordModal({
  open,
  cooperativeId,
  onClose,
  onSaved,
}: {
  open: boolean
  cooperativeId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setPassword('')
  }, [open])

  const save = async () => {
    if (!cooperativeId) return
    setSaving(true)
    try {
      await cooperativeService.changePassword(cooperativeId, password)
      toast.success('Senha alterada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Alterar senha" size="sm">
      <Input label="Nova senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving || password.length < 6}>
          Salvar
        </Button>
      </div>
    </Modal>
  )
}

export function EditEmailModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('')
  const [repeatEmail, setRepeatEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await cooperativeService.updateEmail({ email, repeatEmail, password })
      toast.success('E-mail atualizado!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Alterar e-mail">
      <div className="space-y-4">
        <Input label="Novo e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Confirmar e-mail" value={repeatEmail} onChange={(e) => setRepeatEmail(e.target.value)} />
        <Input label="Senha atual" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function EditPasswordModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [repeatNewPassword, setRepeatNewPassword] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await cooperativeService.updatePassword({ newPassword, repeatNewPassword, password })
      toast.success('Senha atualizada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Alterar senha">
      <div className="space-y-4">
        <Input label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input
          label="Confirmar nova senha"
          type="password"
          value={repeatNewPassword}
          onChange={(e) => setRepeatNewPassword(e.target.value)}
        />
        <Input label="Senha atual" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function DirectMessageModal({
  open,
  onClose,
  onStarted,
  defaultCooperativeId,
}: {
  open: boolean
  onClose: () => void
  onStarted: (conversationId: number) => void
  defaultCooperativeId?: number
}) {
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [cooperativeId, setCooperativeId] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      cooperativeService.select().then(setCoops)
      setCooperativeId(defaultCooperativeId ? String(defaultCooperativeId) : '')
      setMessage('')
    }
  }, [open, defaultCooperativeId])

  const start = async () => {
    setSaving(true)
    try {
      const conv = await conversationService.startDirect({
        cooperativeId: Number(cooperativeId),
        message,
      })
      toast.success('Conversa iniciada!')
      onStarted(conv.id)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova conversa">
      <div className="space-y-4">
        <Select
          label="Cooperativa"
          value={cooperativeId}
          onChange={(e) => setCooperativeId(e.target.value)}
          placeholder="Selecione..."
          options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))}
        />
        <Input label="Mensagem inicial" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={start} disabled={saving || !cooperativeId || !message.trim()}>
            Iniciar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
