import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { environment } from '@/config/environment'
import { cooperativeBusinessLabel } from '@/lib/business'
import { calculateFreeLoadAtStop, refreshRouteDistances, totalRouteKm } from '@/lib/travel'
import { mapService } from '@/services/misc.service'
import { travelService } from '@/services/travel.service'
import type { Travel, TravelRoute } from '@/types'

function truncateAddress(address?: string, max = 40) {
  if (!address) return '—'
  return address.length > max ? `${address.slice(0, max)}…` : address
}

function canSeeRouteDetails(
  route: TravelRoute,
  travel: Travel,
  userCoopId?: number,
  isAdmin?: boolean,
) {
  if (isAdmin) return true
  if (!userCoopId) return false
  return (
    userCoopId === travel.cooperativeId ||
    userCoopId === route.offer?.cooperativeId
  )
}

function canAttachOnRoute(
  route: TravelRoute,
  travel: Travel,
  userCoopId?: number,
  isAdmin?: boolean,
) {
  return canSeeRouteDetails(route, travel, userCoopId, isAdmin)
}

function RouteProductsMenu({ route }: { route: TravelRoute }) {
  const [open, setOpen] = useState(false)
  if (!route.routeProduct?.length) return null

  return (
    <div className="travel-final-route__products">
      <button type="button" className="travel-final-route__products-btn" onClick={() => setOpen((v) => !v)}>
        Ver Produtos
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <ul className="travel-final-route__products-list">
          {route.routeProduct.map((rp, index) => (
            <li key={`${rp.product?.id}-${index}`}>
              <span title={rp.product?.name}>{truncateAddress(rp.product?.name, 24)}</span>
              <span>
                {rp.loadedWeight ? (
                  <span>
                    <ArrowUp size={12} /> {rp.loadedWeight}
                  </span>
                ) : null}
                {rp.unloadedWeight ? (
                  <span>
                    <ArrowDown size={12} /> {rp.unloadedWeight}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RouteAttach({
  route,
  onAttached,
}: {
  route: TravelRoute
  onAttached: (filename: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (route.coopAttachment) {
    return (
      <a
        href={`${environment.storageUrl}${route.coopAttachment}`}
        target="_blank"
        rel="noreferrer"
        className="travel-final-route__attach-link"
      >
        Ver anexo
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        className="travel-final-route__attach-btn"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={14} />
        Anexar
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xml"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file || !route.id) return
          setUploading(true)
          try {
            const res = await travelService.attachFileInRoute(route.id, file)
            onAttached(res.file)
            toast.success('Arquivo anexado!')
          } catch {
            toast.error('Falha ao anexar arquivo')
          } finally {
            setUploading(false)
            e.target.value = ''
          }
        }}
      />
    </>
  )
}

export function TravelFinalRouteView({
  travel,
  userCoopId,
  isAdmin,
  onRoutesChange,
  onEnterEdit,
}: {
  travel: Travel
  userCoopId?: number
  isAdmin?: boolean
  onRoutesChange: (routes: TravelRoute[]) => void
  onEnterEdit: (routes: TravelRoute[]) => void
}) {
  const routes = travel.travelRoutes ?? travel.routes ?? []
  const maxWeight = Number(travel.vehicle?.maximumWeight ?? 0)
  const canManage =
    isAdmin || (userCoopId != null && userCoopId === travel.cooperativeId)

  const freeAt = (index: number) => {
    if (maxWeight > 0) return calculateFreeLoadAtStop(routes, index, maxWeight)
    return routes[index]?.remainingCapacity ?? 0
  }

  const isOfferAwaitingAdjustment = travel.offers?.some(
    (offer) => offer.status === 'confirmedPendingRoutes',
  )

  const handleAttach = (index: number, filename: string) => {
    const next = routes.map((route, i) =>
      i === index ? { ...route, coopAttachment: filename } : route,
    )
    onRoutesChange(next)
  }

  return (
    <div className="travel-final-route">
      <h6 className="travel-final-route__title">Trajeto final</h6>
      <div className="travel-final-route__list">
        {routes.map((route, index) => {
          const last = index === routes.length - 1
          const nextDistance = routes[index + 1]?.distance
          const highlight =
            route.offer &&
            canSeeRouteDetails(route, travel, userCoopId, isAdmin)

          return (
            <div key={`${route.id ?? route.order}-${index}`} className="travel-final-route__item">
              <div className="travel-final-route__distance-col">
                {!last && nextDistance != null ? <span>{nextDistance}km</span> : null}
              </div>
              <div className="travel-final-route__timeline-col">
                <div className={`travel-final-route__circle${last ? ' travel-final-route__circle--last' : ''}`}>
                  {route.order ?? index + 1}
                </div>
              </div>
              <div className="travel-final-route__content">
                <p
                  className={`travel-final-route__address${highlight ? ' travel-final-route__address--offer' : ''}`}
                  title={route.address}
                >
                  {truncateAddress(route.address, 42)}
                </p>
                <div className="travel-final-route__meta">
                  {route.offer?.cooperative && highlight && (
                    <span className="travel-final-route__coop" title={cooperativeBusinessLabel(route.offer.cooperative)}>
                      {truncateAddress(cooperativeBusinessLabel(route.offer.cooperative), 12)}
                    </span>
                  )}
                  <span>
                    <ArrowUp size={13} /> {route.loadingWeight ?? 0}
                  </span>
                  <span>
                    <ArrowDown size={13} /> {route.unloadingWeight ?? 0}
                  </span>
                  <span>Livre: {freeAt(index)}</span>
                  {canAttachOnRoute(route, travel, userCoopId, isAdmin) && (
                    <RouteAttach route={route} onAttached={(file) => handleAttach(index, file)} />
                  )}
                </div>
                {route.offer && route.routeProduct && canSeeRouteDetails(route, travel, userCoopId, isAdmin) && (
                  <RouteProductsMenu route={route} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {routes.length > 0 && (
        <p className="travel-final-route__total">Total: {totalRouteKm(routes)}km</p>
      )}

      {canManage && (
        <AdjustRouteButton
          travelId={travel.id}
          highlight={!!isOfferAwaitingAdjustment}
          onEnterEdit={onEnterEdit}
        />
      )}
    </div>
  )
}

function AdjustRouteButton({
  travelId,
  highlight,
  onEnterEdit,
}: {
  travelId: number
  highlight: boolean
  onEnterEdit: (routes: TravelRoute[]) => void
}) {
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const routes = await travelService.getRoutesWithProposal(travelId)
      onEnterEdit(routes)
    } catch {
      toast.error('Erro ao carregar trajeto com propostas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      className={`travel-final-route__adjust-btn${highlight ? ' travel-final-route__adjust-btn--highlight' : ''}`}
      variant={highlight ? undefined : 'outline'}
      disabled={loading}
      onClick={load}
    >
      {loading
        ? 'Carregando...'
        : highlight
          ? 'Clique aqui e ajuste a ordem de paradas da oferta recebida'
          : 'Clique aqui para ajustar a ordem de paradas'}
    </Button>
  )
}

export function TravelRouteReorderEditor({
  travel,
  routes,
  onChange,
  onCancel,
  onSaved,
}: {
  travel: Travel
  routes: TravelRoute[]
  onChange: (routes: TravelRoute[]) => void
  onCancel: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const routesRef = useRef(routes)
  routesRef.current = routes
  const maxWeight = Number(travel.vehicle?.maximumWeight ?? 0)

  const recalcDistances = (list: TravelRoute[]) =>
    refreshRouteDistances(list, (from, to) =>
      mapService.distance(from.latitude, from.longitude, to.latitude, to.longitude),
    )

  const move = async (from: number, to: number) => {
    const current = routesRef.current
    if (to < 0 || to >= current.length || from === to || recalculating) return

    const next = [...current]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)

    setRecalculating(true)
    try {
      const updated = await recalcDistances(next)
      onChange(updated)
    } finally {
      setRecalculating(false)
    }
  }

  const onDrop = async (targetIndex: number) => {
    if (dragIndex == null || dragIndex === targetIndex || recalculating) {
      setDragIndex(null)
      return
    }
    await move(dragIndex, targetIndex)
    setDragIndex(null)
  }

  const freeAt = (index: number) => {
    if (maxWeight > 0) return calculateFreeLoadAtStop(routes, index, maxWeight)
    return routes[index]?.remainingCapacity ?? 0
  }

  const save = async () => {
    const lastFree = freeAt(routes.length - 1)
    if (lastFree < 0) {
      toast.error('O veículo está com carga acima do limite máximo de peso.')
      return
    }
    setSaving(true)
    try {
      await travelService.adjustRouteOrder(travel.id, routes)
      toast.success('Trajeto da viagem alterado com sucesso!')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="travel-route-reorder">
      <h6 className="travel-final-route__title">Trajeto final com propostas</h6>
      <div className="travel-route-reorder__list">
        {routes.map((route, index) => (
          <div
            key={`${route.id}-${index}`}
            className={`travel-route-reorder__item${dragIndex === index ? ' travel-route-reorder__item--dragging' : ''}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className="travel-route-reorder__handle">
              <GripVertical size={16} />
            </div>
            <div
              className={`travel-route-reorder__number${route.offer ? ' travel-route-reorder__number--offer' : ''}`}
            >
              {index + 1}
            </div>
            <div className="travel-route-reorder__body">
              {route.offer?.cooperative && (
                <span className="travel-route-reorder__coop">
                  {cooperativeBusinessLabel(route.offer.cooperative)}
                </span>
              )}
              <p className={`travel-route-reorder__address${route.offer ? ' travel-route-reorder__address--offer' : ''}`}>
                {route.address}
              </p>
              <div className="travel-final-route__meta">
                {route.loadingWeight ? (
                  <span>
                    <ArrowUp size={13} /> {route.loadingWeight}
                  </span>
                ) : null}
                {route.unloadingWeight ? (
                  <span>
                    <ArrowDown size={13} /> {route.unloadingWeight}
                  </span>
                ) : null}
                <span>LIVRE: {freeAt(index)}</span>
              </div>
              {route.routeProduct && route.routeProduct.length > 0 && <RouteProductsMenu route={route} />}
            </div>
            <div className="travel-route-reorder__moves">
              <button
                type="button"
                disabled={index === 0 || recalculating}
                onClick={() => move(index, index - 1)}
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                disabled={index === routes.length - 1 || recalculating}
                onClick={() => move(index, index + 1)}
              >
                <ChevronDown size={16} />
              </button>
            </div>
            {index < routes.length - 1 && (
              <span className="travel-route-reorder__segment">
                {recalculating ? '…' : `${routes[index + 1]?.distance ?? 0}km`}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="travel-final-route__total">Total: {totalRouteKm(routes)}km</p>
      <div className="travel-modal-footer">
        <Button variant="ghost" onClick={onCancel}>
          Voltar
        </Button>
        <Button onClick={save} disabled={saving || recalculating}>
          {saving ? 'Salvando...' : 'Confirmar alterações'}
        </Button>
      </div>
    </div>
  )
}
