import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRight, Truck, UserRound } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { cooperativeService, cooperativeLabel } from '@/services/cooperative.service'
import { driverService } from '@/services/driver.service'
import { vehicleService } from '@/services/vehicle.service'
import { travelService, travelOfferService } from '@/services/travel.service'
import { CreateTravelRouteStep, type TravelStopDraft } from '@/components/travel/CreateTravelRouteStep'
import {
  OriginalRoutePreview,
  TravelOfferRouteStep,
  type OfferStopDraft,
} from '@/components/travel/TravelOfferRouteStep'
import {
  TravelFinalRouteView,
  TravelRouteReorderEditor,
} from '@/components/travel/TravelFinalRouteSection'
import { RouteTimeline } from '@/components/travel/RouteTimeline'
import { BusinessViewModal } from '@/components/business/BusinessViewModal'
import {
  buildStartDateTimeUtc,
  formatTravelDateTime,
  getTravelRoutes,
  totalRouteKm,
  travelOfferStatusClass,
  travelOfferStatusLabel,
  travelStatusClass,
  travelStatusLabel,
} from '@/lib/travel'
import type { Business, Driver, Travel, TravelRoute, Vehicle } from '@/types'
import { BusinessType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

function vehicleLabel(v: { model?: string; licensePlate?: string; name?: string; id: number }) {
  if (v.model && v.licensePlate) return `${v.model} - ${v.licensePlate}`
  return v.name ?? String(v.id)
}

export function TravelModal({
  open,
  travel,
  travelId,
  onClose,
  onSaved,
}: {
  open: boolean
  travel?: Travel | null
  travelId?: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user, isAdmin } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | undefined>()
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>()
  const [stops, setStops] = useState<TravelStopDraft[]>([])
  const [form, setForm] = useState({
    cooperativeId: '',
    driverId: '',
    vehicleId: '',
    date: '',
    hour: '',
  })
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setStep(1)
    setStops([])
    setSelectedDriver(undefined)
    setSelectedVehicle(undefined)
    setEditId(null)
    setForm({
      cooperativeId: String(user?.cooperative?.id ?? ''),
      driverId: '',
      vehicleId: '',
      date: '',
      hour: '',
    })
    setLoading(true)

    const load = async () => {
      try {
        const id = travel?.id ?? travelId ?? null
        const isEdit = id != null

        if (isAdmin) {
          const coopList = await cooperativeService.select()
          if (!cancelled) setCoops(coopList)
        }

        let data = travel ?? null
        if (isEdit && !data) data = await travelService.view(id)

        const coopId = data?.cooperativeId ?? user?.cooperative?.id
        if (coopId) {
          const [d, v] = await Promise.all([
            driverService.select(coopId),
            vehicleService.select(coopId),
          ])
          if (!cancelled) {
            setDrivers(d as Driver[])
            setVehicles(v as Vehicle[])
          }
        }

        if (data && !cancelled) {
          setEditId(data.id)
          const dt = data.startDateTime ? new Date(data.startDateTime) : null
          setForm({
            cooperativeId: String(data.cooperativeId ?? ''),
            driverId: String(data.driverId ?? ''),
            vehicleId: String(data.vehicleId ?? ''),
            date: dt ? dt.toISOString().slice(0, 10) : '',
            hour: dt ? dt.toTimeString().slice(0, 5) : '',
          })
          setSelectedDriver(data.driver)
          setSelectedVehicle(data.vehicle)
          const routes = getTravelRoutes(data)
          setStops(
            routes.map((route) => ({
              address: route.address ?? '',
              coordinates: {
                latitude: route.latitude ?? 0,
                longitude: route.longitude ?? 0,
              },
              load: Number(route.loadingWeight ?? route.load ?? 0),
              unload: Number(route.unloadingWeight ?? route.unload ?? 0),
              distance: route.distance ?? 0,
              order: route.order ?? 0,
            })),
          )
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Erro ao carregar dados da viagem')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, travel, travelId, isAdmin, user?.cooperative?.id])

  const onCoopChange = async (coopId: string) => {
    setForm({ ...form, cooperativeId: coopId, driverId: '', vehicleId: '' })
    setSelectedDriver(undefined)
    setSelectedVehicle(undefined)
    if (!coopId) {
      setDrivers([])
      setVehicles([])
      return
    }
    try {
      const [d, v] = await Promise.all([
        driverService.select(Number(coopId)),
        vehicleService.select(Number(coopId)),
      ])
      setDrivers(d as Driver[])
      setVehicles(v as Vehicle[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar motoristas e veículos')
    }
  }

  const onVehicleChange = (vehicleId: string) => {
    setForm({ ...form, vehicleId })
    setSelectedVehicle(vehicles.find((v) => String(v.id) === vehicleId))
  }

  const onDriverChange = (driverId: string) => {
    setForm({ ...form, driverId })
    setSelectedDriver(drivers.find((d) => String(d.id) === driverId))
  }

  const stepOneValid =
    form.driverId &&
    form.vehicleId &&
    form.date &&
    form.hour &&
    (!isAdmin || form.cooperativeId)

  const save = async () => {
    if (stops.length < 2) {
      toast.error('O trajeto deve ter no mínimo duas paradas.')
      return
    }
    const last = stops[stops.length - 1]
    if (last.load > 0) {
      toast.error('A última parada não pode terminar com carga. Adicione uma parada para descarregar.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        cooperativeId: Number(form.cooperativeId || user?.cooperative?.id),
        driverId: Number(form.driverId),
        vehicleId: Number(form.vehicleId),
        startDateTime: buildStartDateTimeUtc(form.date, form.hour),
        stops: stops.map((stop, index) => ({
          address: stop.address,
          coordinates: stop.coordinates,
          load: stop.load,
          unload: stop.unload,
          order: index + 1,
        })),
      }
      if (editId) await travelService.update(editId, payload)
      else await travelService.create(payload)
      toast.success(editId ? 'Viagem atualizada!' : 'Viagem cadastrada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar viagem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${editId ? 'Editar' : 'Cadastrar'} Viagem${editId ? ` - #${editId}` : ''}`}
      size="lg"
    >
      {loading ? (
        <LoadingOverlay visible inline message="Carregando..." />
      ) : (
        <>
          {step === 1 ? (
            <div className="travel-modal-step">
              {isAdmin && (
                <Select
                  label="Cooperativa"
                  value={form.cooperativeId}
                  onChange={(e) => onCoopChange(e.target.value)}
                  placeholder="Selecione..."
                  options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))}
                />
              )}
              <Select
                label="Veículo"
                value={form.vehicleId}
                onChange={(e) => onVehicleChange(e.target.value)}
                placeholder="Selecione..."
                options={vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))}
              />
              {selectedVehicle && (
                <div className="travel-modal-vehicle-meta">
                  <span>
                    <Truck size={14} /> {selectedVehicle.model}
                  </span>
                  <span>Peso máx: {selectedVehicle.maximumWeight}kg</span>
                  <span>Volume: {selectedVehicle.volume}m³</span>
                </div>
              )}
              <Select
                label="Motorista"
                value={form.driverId}
                onChange={(e) => onDriverChange(e.target.value)}
                placeholder="Selecione..."
                options={drivers.map((d) => ({ value: d.id, label: d.name }))}
              />
              <div className="travel-modal-step__row">
                <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <Input label="Horário" type="time" value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })} />
              </div>
            </div>
          ) : (
            <CreateTravelRouteStep
              date={form.date}
              hour={form.hour}
              driver={selectedDriver}
              vehicle={selectedVehicle}
              stops={stops}
              onChange={setStops}
            />
          )}

          <div className="travel-modal-footer">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {step === 1 ? (
              <Button disabled={!stepOneValid} onClick={() => setStep(2)}>
                Próxima
              </Button>
            ) : (
              <Button onClick={save} disabled={saving || stops.length < 2}>
                {saving ? 'Salvando...' : editId ? 'Editar Viagem' : 'Cadastrar Viagem'}
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

export function TravelViewModal({
  open,
  travelId,
  onClose,
}: {
  open: boolean
  travelId: number | null
  onClose: () => void
}) {
  const { user, isAdmin, isCooperative } = useAuth()
  const [loading, setLoading] = useState(false)
  const [travel, setTravel] = useState<(Travel & { offers?: import('@/types').TravelOffer[] }) | null>(null)
  const [viewBusiness, setViewBusiness] = useState<Business | null>(null)
  const [localRoutes, setLocalRoutes] = useState<TravelRoute[]>([])
  const [editingRoutes, setEditingRoutes] = useState<TravelRoute[] | null>(null)

  const reloadTravel = () => {
    if (!travelId) return
    setLoading(true)
    travelService
      .getWithOffers(travelId)
      .then((data) => {
        setTravel(data)
        setLocalRoutes(data.travelRoutes ?? data.routes ?? [])
      })
      .catch(() => toast.error('Erro ao carregar viagem'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open || !travelId) {
      setTravel(null)
      setLocalRoutes([])
      setEditingRoutes(null)
      return
    }
    setEditingRoutes(null)
    reloadTravel()
  }, [open, travelId])
  const travelWithRoutes = travel ? { ...travel, travelRoutes: localRoutes } : null
  const isOwner =
    isAdmin ||
    (isCooperative && user?.cooperative?.id === travel?.cooperativeId)

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Viagem #${travelId ?? ''} - Oferta`} size="lg">
        {loading ? (
          <LoadingOverlay visible inline message="Carregando detalhes..." />
        ) : travelWithRoutes ? (
          <div className="travel-view-modal">
            {!editingRoutes && (
              <div className="travel-view-modal__details">
                <h6>Detalhes</h6>
                <div className="travel-view-modal__meta">
                  <span className={travelStatusClass(travelWithRoutes.status)}>
                    {travelStatusLabel(travelWithRoutes.status)}
                  </span>
                  <span>
                    <Truck size={14} /> {travelWithRoutes.vehicle?.type?.name ?? travelWithRoutes.vehicle?.model ?? '—'}
                  </span>
                  <span>
                    <UserRound size={14} /> {travelWithRoutes.driver?.name ?? '—'}
                  </span>
                </div>
                <span className="travel-route-step__date">{formatTravelDateTime(travelWithRoutes.startDateTime)}</span>
              </div>
            )}

            {editingRoutes ? (
              <TravelRouteReorderEditor
                travel={travelWithRoutes}
                routes={editingRoutes}
                onChange={setEditingRoutes}
                onCancel={() => setEditingRoutes(null)}
                onSaved={() => {
                  setEditingRoutes(null)
                  reloadTravel()
                  onClose()
                }}
              />
            ) : (
              <TravelFinalRouteView
                travel={travelWithRoutes}
                userCoopId={user?.cooperative?.id}
                isAdmin={isAdmin}
                onRoutesChange={setLocalRoutes}
                onEnterEdit={setEditingRoutes}
              />
            )}

            {!editingRoutes && travelWithRoutes.offers && travelWithRoutes.offers.length > 0 && (
              <div className="travel-view-modal__section">
                <h6>Propostas</h6>
                {isOwner ? (
                  <p className="travel-view-modal__note">
                    Esta viagem já recebeu {travelWithRoutes.offers.length} proposta(s)!
                  </p>
                ) : (
                  <p className="travel-view-modal__note">Você enviou uma proposta para esta viagem.</p>
                )}
                <div className="travel-view-modal__offers">
                  {travelWithRoutes.offers!.map((offer, index) => (
                    <div key={offer.id} className="travel-view-modal__offer">
                      <span className={travelOfferStatusClass(offer.status)}>
                        {index + 1} - {travelOfferStatusLabel(offer.status)}
                      </span>
                      {(offer.status === 'confirmed' || offer.status === 'confirmedPendingRoutes') && (
                        <>
                          <span className="travel-view-modal__km">{offer.totalDistance}km</span>
                          {offer.business?.fee != null && (
                            <span className="travel-view-modal__fee">
                              R$ {Number(offer.business.fee).toFixed(2)}
                            </span>
                          )}
                        </>
                      )}
                      {offer.status !== 'awaiting' && offer.business?.id && (
                        <button
                          type="button"
                          className="travel-view-modal__see-offer"
                          onClick={() =>
                            setViewBusiness({
                              id: offer.business!.id,
                              type: BusinessType.V,
                              travelOffer: { id: offer.id },
                            })
                          }
                        >
                          Ver oferta <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!editingRoutes && (
              <div className="travel-view-modal__footer">
                <Button variant="ghost" className="travel-view-modal__close-btn" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="travel-empty-inline">Viagem não encontrada.</p>
        )}
      </Modal>

      <BusinessViewModal
        open={!!viewBusiness}
        business={viewBusiness}
        onClose={() => setViewBusiness(null)}
      />
    </>
  )
}

export function TravelOfferModal({
  open,
  travelId,
  onClose,
  onSaved,
}: {
  open: boolean
  travelId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [travel, setTravel] = useState<Travel | null>(null)
  const [products, setProducts] = useState<{ id: number; name: string }[]>([])
  const [stops, setStops] = useState<OfferStopDraft[]>([])
  const [message, setMessage] = useState('')
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !travelId) return
    setStep(1)
    setStops([])
    setMessage('')
    setEstimatedPrice(null)
    setLoading(true)
    const load = async () => {
      try {
        const coopId = user?.cooperative?.id
        if (!coopId) return
        const [t, catalog] = await Promise.all([
          travelService.view(travelId),
          cooperativeService.selectProducts(coopId),
        ])
        setTravel(t)
        setProducts(catalog.map((p) => ({ id: p.id, name: p.name ?? `Produto #${p.id}` })))
      } catch {
        toast.error('Erro ao carregar viagem')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, travelId, user?.cooperative?.id, onClose])

  const estimate = async () => {
    if (!travel || stops.length < 2) {
      toast.error('Adicione pelo menos duas paradas antes de estimar.')
      return
    }
    try {
      const productsLoad = stops.flatMap((stop) => stop.productsLoad)
      const res = await travelOfferService.estimatePrice({
        totalDistance: totalRouteKm(
          stops.map((s) => ({ distance: s.distance })),
        ),
        vehicleId: travel.vehicleId,
        productsLoad,
      })
      setEstimatedPrice(res.price)
    } catch {
      toast.error('Erro ao estimar preço')
    }
  }

  const save = async () => {
    if (!travelId || stops.length < 2) {
      toast.error('A proposta deve ter no mínimo duas paradas.')
      return
    }
    setSaving(true)
    try {
      await travelOfferService.create({
        travelId,
        initialMessage: message || undefined,
        stops: stops.map((stop, index) => ({
          address: stop.address,
          coordinates: stop.coordinates,
          productsLoad: stop.productsLoad,
          productsUnload: stop.productsUnload,
          order: index + 1,
        })),
      })
      toast.success('Proposta enviada! Acompanhe em Negócios.')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar proposta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Viagem #${travelId ?? ''} - Oferta`} size="lg">
      {loading || !travel ? (
        <LoadingOverlay visible inline message="Carregando viagem..." />
      ) : (
        <>
          <div className="travel-view-modal__details">
            <div className="travel-view-modal__meta">
              <span className={travelStatusClass(travel.status)}>{travelStatusLabel(travel.status)}</span>
              <span>
                <Truck size={14} /> {travel.vehicle?.type?.name ?? '—'}
              </span>
            </div>
            <span className="travel-route-step__date">{formatTravelDateTime(travel.startDateTime)}</span>
          </div>

          <OriginalRoutePreview routes={getTravelRoutes(travel)} />

          {step === 1 ? (
            <TravelOfferRouteStep travel={travel} products={products} stops={stops} onChange={setStops} />
          ) : (
            <div className="travel-offer-review">
              <h6>Revisão da proposta</h6>
              <RouteTimeline
                routes={stops.map((stop, index) => ({
                  order: index + 1,
                  address: stop.address,
                  distance: stop.distance,
                  loadingWeight: stop.productsLoad.reduce((s, p) => s + p.weight, 0),
                  unloadingWeight: stop.productsUnload.reduce((s, p) => s + p.weight, 0),
                }))}
              />
              {estimatedPrice != null && (
                <p className="travel-offer-review__price">
                  Preço estimado: <strong>R$ {estimatedPrice.toFixed(2)}</strong>
                </p>
              )}
              <Textarea
                label="Mensagem inicial"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva sua proposta. A Rede COOP fará a intermediação."
              />
              <p className="travel-offer-review__note">
                Após enviar, acompanhe a negociação em <strong>Negócios</strong>.
              </p>
            </div>
          )}

          <div className="travel-modal-footer">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {step === 1 ? (
              <Button disabled={stops.length < 2} onClick={() => setStep(2)}>
                Revisar proposta
              </Button>
            ) : (
              <div className="travel-modal-footer__actions">
                <Button variant="outline" onClick={estimate}>
                  Estimar preço
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? 'Enviando...' : 'Enviar oferta'}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

export function TravelFinalizeModal({
  open,
  travel,
  onClose,
  onSaved,
}: {
  open: boolean
  travel: Travel | null
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setDate(`${yyyy}-${mm}-${dd}`)
  }, [open, travel?.id])

  const save = async () => {
    if (!travel || !date) {
      toast.error('Informe a data de finalização.')
      return
    }
    setSaving(true)
    try {
      const completedAt = new Date(`${date}T12:00:00`).toISOString()
      await travelService.finalize(travel.id, { completedAt })
      toast.success('Viagem finalizada!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao finalizar viagem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Finalizar viagem" size="sm">
      <div className="travel-finalize-modal">
        <p className="travel-finalize-modal__hint">
          Informe a data em que a viagem foi concluída.
        </p>
        <Input
          label="Data de finalização"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="travel-finalize-modal__actions">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Finalizar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
