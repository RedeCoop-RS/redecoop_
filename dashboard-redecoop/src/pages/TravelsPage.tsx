import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Calendar, CheckCircle2, Eye, Pencil, Search, Trash2, Truck } from 'lucide-react'
import { travelService, type TravelListFilters } from '@/services/travel.service'
import { vehicleService } from '@/services/vehicle.service'
import {
  TravelModal,
  TravelOfferModal,
  TravelViewModal,
  TravelFinalizeModal,
} from '@/components/modals/TravelModals'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { Pagination } from '@/components/ui/Pagination'
import { TableActionsMenu } from '@/components/ui/TableActionsMenu'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import { BUSINESS_YEARS, buildDateFilter, cooperativeBusinessLabel } from '@/lib/business'
import {
  formatTravelDateTime,
  formatTravelDeparture,
  getLastTravelRouteAddress,
  getTravelRoutes,
  travelStatusClass,
  travelStatusLabel,
} from '@/lib/travel'
import type { Travel } from '@/types'

const MONTH_OPTIONS = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
]

const PAGE_SIZE = 20

function MyTravelRow({
  travel,
  isAdmin,
  onView,
  onEdit,
  onDelete,
}: {
  travel: Travel
  isAdmin: boolean
  onView: (travel: Travel) => void
  onEdit: (travel: Travel) => void
  onDelete: (travel: Travel) => void
}) {
  const routes = getTravelRoutes(travel)
  const routeTooltip = routes.map((r) => `${r.order ?? ''}. ${r.address ?? ''}`).join('\n')

  const actions = useMemo(
    () => [
      {
        label: 'Ver',
        icon: <Eye size={15} />,
        onClick: onView,
      },
      {
        label: 'Editar',
        icon: <Pencil size={15} />,
        hidden: (row: Travel) => !row.isOffer && !isAdmin,
        onClick: onEdit,
      },
      {
        label: 'Excluir',
        icon: <Trash2 size={15} />,
        variant: 'danger' as const,
        onClick: onDelete,
      },
    ],
    [isAdmin, onView, onEdit, onDelete],
  )

  return (
    <tr>
      <td data-label={isAdmin ? 'Ofertante' : 'Tipo'} className="my-travels-table__type">
        {isAdmin
          ? cooperativeBusinessLabel(travel.cooperative)
          : travel.isOffer
            ? 'Oferta'
            : 'Participação'}
      </td>
      <td data-label="Id" className="my-travels-table__id">{travel.id}</td>
      <td data-label="Trajeto" className="my-travels-table__route">
        <span className="my-travels-table__route-text" title={routeTooltip}>
          {getLastTravelRouteAddress(travel)}
        </span>
      </td>
      <td data-label="Saída" className="my-travels-table__date">{formatTravelDeparture(travel.startDateTime)}</td>
      <td data-label="Solicitações" className="my-travels-table__offers">
        {travel.offerCount && travel.offerCount > 0 ? (
          <>
            {travel.offerCount} -{' '}
            <button type="button" className="my-travels-table__link" onClick={() => onView(travel)}>
              Ver
            </button>
          </>
        ) : (
          '—'
        )}
      </td>
      <td data-label="Status">
        <span className={travelStatusClass(travel.status)}>{travelStatusLabel(travel.status)}</span>
      </td>
      <td data-label="Ações" className="my-travels-table__actions">
        <TableActionsMenu row={travel} actions={actions} />
      </td>
    </tr>
  )
}

function TravelCard({
  travel,
  index,
  stopsShown,
  onToggleStops,
  onOffer,
  showOffer,
  showAdminMenu,
  onFinalize,
}: {
  travel: Travel
  index: number
  stopsShown: Map<number, number>
  onToggleStops: (index: number) => void
  onOffer?: () => void
  showOffer?: boolean
  showAdminMenu?: boolean
  onFinalize?: (travel: Travel) => void
}) {
  const routes = getTravelRoutes(travel)
  const shown = stopsShown.get(index) ?? 5
  const visible = routes.slice(0, shown)
  const hasMore = routes.length > 5
  const isCompleted = travel.status === 'completed'

  const adminActions = useMemo(
    () => [
      {
        label: 'Finalizar viagem',
        icon: <CheckCircle2 size={15} />,
        hidden: (row: Travel) => row.status === 'completed',
        onClick: (row: Travel) => onFinalize?.(row),
      },
    ],
    [onFinalize],
  )

  return (
    <article className={`travel-card${isCompleted ? ' travel-card--completed' : ''}`}>
      {showAdminMenu && (
        <div className="travel-card__header">
          {isCompleted ? (
            <span className={travelStatusClass(travel.status)}>
              {travelStatusLabel(travel.status)}
              {travel.completedAt
                ? ` · ${new Date(travel.completedAt).toLocaleDateString('pt-BR')}`
                : ''}
            </span>
          ) : (
            <span />
          )}
          <TableActionsMenu row={travel} actions={adminActions} />
        </div>
      )}
      <div className="travel-card__body">
        <div className="travel-card__meta">
          <p>
            <Calendar size={14} />
            {formatTravelDateTime(travel.startDateTime)}
          </p>
          <p>
            <Truck size={14} />
            Modelo do veículo - {travel.vehicle?.type?.name ?? travel.vehicle?.model ?? '—'}
          </p>
        </div>
        <div className="travel-card__routes">
          {visible.map((stop, i) => (
            <div key={`${stop.order}-${i}`} className="travel-card__route">
              <span className="travel-card__dot" />
              <span className="travel-card__address" title={stop.address}>
                {(stop.address ?? '').length > 22
                  ? `${(stop.address ?? '').slice(0, 22)}…`
                  : stop.address}
              </span>
              {stop.remainingCapacity != null && (
                <span className="travel-card__capacity">{stop.remainingCapacity}kg</span>
              )}
            </div>
          ))}
          {hasMore && (
            <button type="button" className="travel-card__toggle" onClick={() => onToggleStops(index)}>
              {shown >= routes.length ? 'Ocultar' : `+${routes.length - 5}`}
            </button>
          )}
        </div>
      </div>
      {showOffer && onOffer && (
        <Button className="travel-card__action" onClick={onOffer}>
          Enviar oferta
        </Button>
      )}
    </article>
  )
}

function TravelsListPage({ mode }: { mode: 'available' | 'my' }) {
  const { isCooperative, isAdmin, user } = useAuth()
  const { confirm } = useModal()
  const userCoopId = user?.cooperative?.id

  const [items, setItems] = useState<Travel[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [stopsShown, setStopsShown] = useState<Map<number, number>>(new Map())

  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterVehicleType, setFilterVehicleType] = useState('')
  const [availableStatusFilter, setAvailableStatusFilter] = useState<'awaiting' | 'completed' | ''>('awaiting')
  const [filterType, setFilterType] = useState<'offerer' | 'participant' | ''>('')
  const [notFinished, setNotFinished] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'completed' | 'awaiting' | ''>('')
  const [appliedFilters, setAppliedFilters] = useState<TravelListFilters>({})

  const [vehicleTypes, setVehicleTypes] = useState<{ id: number; name: string }[]>([])
  const [openCounts, setOpenCounts] = useState({ open: 0, completed: 0 })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTravelId, setEditTravelId] = useState<number | null>(null)
  const [viewTravelId, setViewTravelId] = useState<number | null>(null)
  const [offerTravelId, setOfferTravelId] = useState<number | null>(null)
  const [finalizeTravel, setFinalizeTravel] = useState<Travel | null>(null)

  useEffect(() => {
    vehicleService.types().then(setVehicleTypes)
  }, [])

  const loadPage = useCallback(
    async (targetPage: number, append = false) => {
      if (targetPage === 1 && !append) setLoading(true)
      else setLoadingMore(true)
      try {
        const result =
          mode === 'available'
            ? await travelService.available(targetPage, PAGE_SIZE, {
                startDateTime: appliedFilters.startDateTime,
                vehicleTypeId: appliedFilters.vehicleTypeId,
                status: appliedFilters.status,
              })
            : await travelService.myTravels(targetPage, PAGE_SIZE, appliedFilters)

        setItems((prev) => {
          const next = append ? [...prev, ...result.data] : result.data
          const map = new Map<number, number>()
          next.forEach((_, index) => map.set(index, 5))
          setStopsShown(map)
          return next
        })
        setPage(result.meta.currentPage ?? targetPage)
        setTotal(result.meta.totalItems ?? 0)
        if (mode === 'my') {
          const counts = result as typeof result & { openCount?: number; completedCount?: number }
          setOpenCounts({
            open: Number(counts.openCount ?? counts.raw?.openCount ?? 0),
            completed: Number(counts.completedCount ?? counts.raw?.completedCount ?? 0),
          })
        }
      } catch {
        toast.error('Erro ao carregar viagens')
        if (!append) setItems([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [mode, appliedFilters],
  )

  useEffect(() => {
    loadPage(1, false)
  }, [loadPage])

  const applyFilters = () => {
    const nextStatus = mode === 'my' && notFinished ? '' : statusFilter
    if (mode === 'my' && notFinished) setStatusFilter('')

    setPage(1)
    setAppliedFilters({
      startDateTime: buildDateFilter(filterYear, filterMonth) || undefined,
      vehicleTypeId: filterVehicleType || undefined,
      status:
        mode === 'available' && isAdmin && availableStatusFilter
          ? availableStatusFilter
          : mode === 'my' && nextStatus
            ? nextStatus
            : undefined,
      notfinished: mode === 'my' && notFinished && !nextStatus ? true : undefined,
      type: mode === 'my' ? filterType || undefined : undefined,
    })
  }

  const toggleStops = (index: number) => {
    const travel = items[index]
    const routes = getTravelRoutes(travel)
    setStopsShown((prev) => {
      const next = new Map(prev)
      const current = next.get(index) ?? 5
      next.set(index, current >= routes.length ? 5 : routes.length)
      return next
    })
  }

  const deleteTravel = useCallback(
    async (travel: Travel) => {
      const ok = await confirm({
        title: 'Excluir viagem',
        message: 'Tem certeza que deseja excluir esta viagem?',
        confirmLabel: 'Excluir',
        variant: 'danger',
      })
      if (!ok) return
      try {
        await travelService.delete(travel.id)
        toast.success('Viagem excluída!')
        loadPage(1, false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir')
      }
    },
    [confirm, loadPage],
  )

  const handleViewTravel = useCallback((travel: Travel) => {
    setViewTravelId(travel.id)
  }, [])

  const handleEditTravel = useCallback((travel: Travel) => {
    setEditTravelId(travel.id)
  }, [])

  const handleFinalizeTravel = useCallback((travel: Travel) => {
    setFinalizeTravel(travel)
  }, [])

  const titles = {
    available: { title: 'Viagens Disponíveis', desc: 'Frete compartilhado entre cooperativas.' },
    my: { title: 'Minhas Viagens', desc: 'Viagens que você ofereceu ou participa.' },
  }
  const t = titles[mode]
  const canCreate = mode === 'my' || isCooperative || isAdmin

  return (
    <div className={`travel-page${mode === 'my' ? ' travel-page--my' : ''}`}>
      <PageHeader
        kicker="CoopFrete"
        title={t.title}
        description={t.desc}
        actions={
          mode === 'available' && canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>Cadastrar Viagem</Button>
          ) : undefined
        }
      />

      <div className="travel-filters">
        <Select
          label="Ano"
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value)
            if (!e.target.value) setFilterMonth('')
          }}
          placeholder="Todos"
          options={BUSINESS_YEARS.map((y) => ({ value: y, label: y }))}
        />
        <Select
          label="Mês"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          placeholder="Todos"
          disabled={!filterYear}
          options={MONTH_OPTIONS}
        />
        {mode === 'available' && (
          <Select
            label="Tipo Caminhão"
            value={filterVehicleType}
            onChange={(e) => setFilterVehicleType(e.target.value)}
            placeholder="Todos"
            options={vehicleTypes.map((vt) => ({ value: vt.id, label: vt.name }))}
          />
        )}
        {mode === 'available' && isAdmin && (
          <Select
            label="Status"
            value={availableStatusFilter}
            onChange={(e) =>
              setAvailableStatusFilter(e.target.value as 'awaiting' | 'completed' | '')
            }
            options={[
              { value: 'awaiting', label: 'Em aberto' },
              { value: 'completed', label: 'Finalizadas' },
            ]}
          />
        )}
        {mode === 'my' && !isAdmin && (
          <Select
            label="Tipo"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            placeholder="Todos"
            options={[
              { value: 'participant', label: 'Participação' },
              { value: 'offerer', label: 'Oferta' },
            ]}
          />
        )}
        {mode === 'my' && (
          <label className="business-filters__check">
            <input
              type="checkbox"
              checked={notFinished}
              onChange={(e) => setNotFinished(e.target.checked)}
            />
            <span>Não mostrar viagens já concluídas</span>
          </label>
        )}
        <Button onClick={applyFilters} className="business-filters__btn">
          <Search size={16} />
          Filtrar
        </Button>
      </div>

      {mode === 'my' && (
        <div className="my-travels-toolbar">
          <div className="travel-summary my-travels-summary">
            <button
              type="button"
              className={statusFilter === 'completed' ? 'travel-summary__btn--active' : ''}
              onClick={() => {
                const next = statusFilter === 'completed' ? '' : 'completed'
                setStatusFilter(next)
                setNotFinished(false)
                setAppliedFilters((f) => ({
                  ...f,
                  status: next || undefined,
                  notfinished: undefined,
                }))
              }}
            >
              {openCounts.completed} Viagens já feitas
            </button>
            <button
              type="button"
              className={statusFilter === 'awaiting' ? 'travel-summary__btn--active' : ''}
              onClick={() => {
                const next = statusFilter === 'awaiting' ? '' : 'awaiting'
                setStatusFilter(next)
                setNotFinished(false)
                setAppliedFilters((f) => ({
                  ...f,
                  status: next || undefined,
                  notfinished: undefined,
                }))
              }}
            >
              {openCounts.open} Viagens em aberto
            </button>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>Cadastrar Viagem</Button>
          )}
        </div>
      )}

      {loading ? (
        <LoadingOverlay visible inline message="Buscando viagens..." />
      ) : items.length === 0 ? (
        <div className="opportunity-empty">
          <h5>Nada encontrado!</h5>
        </div>
      ) : mode === 'available' ? (
        <div className="travel-grid">
          {items.map((travel, index) => (
            <TravelCard
              key={travel.id}
              travel={travel}
              index={index}
              stopsShown={stopsShown}
              onToggleStops={toggleStops}
              showOffer={
                isCooperative &&
                travel.status !== 'completed' &&
                userCoopId !== travel.cooperativeId &&
                userCoopId !== travel.cooperative?.id
              }
              onOffer={() => setOfferTravelId(travel.id)}
              showAdminMenu={isAdmin}
              onFinalize={handleFinalizeTravel}
            />
          ))}
        </div>
      ) : (
        <div className="my-travels-table-card">
          <div className="my-travels-table-wrap">
            <table className="my-travels-table table-cards-mobile">
              <thead>
                <tr>
                  <th>{isAdmin ? 'Ofertante' : 'Tipo'}</th>
                  <th>Id</th>
                  <th>Trajeto</th>
                  <th>Saída</th>
                  <th>Solicitações</th>
                  <th>Status</th>
                  <th className="my-travels-table__actions-head" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {items.map((travel) => (
                  <MyTravelRow
                    key={travel.id}
                    travel={travel}
                    isAdmin={isAdmin}
                    onView={handleViewTravel}
                    onEdit={handleEditTravel}
                    onDelete={deleteTravel}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="my-travels-pagination">
            <Pagination
              page={page}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={(p) => loadPage(p, false)}
            />
          </div>
        </div>
      )}

      {mode === 'available' && page * PAGE_SIZE < total && (
        <div className="opportunity-load-more">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => loadPage(page + 1, true)}
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais viagens'}
          </button>
        </div>
      )}

      <TravelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => loadPage(1, false)}
      />
      <TravelModal
        open={editTravelId != null}
        travelId={editTravelId}
        onClose={() => setEditTravelId(null)}
        onSaved={() => loadPage(page, false)}
      />
      <TravelViewModal
        open={viewTravelId != null}
        travelId={viewTravelId}
        onClose={() => setViewTravelId(null)}
      />
      <TravelOfferModal
        open={offerTravelId != null}
        travelId={offerTravelId}
        onClose={() => setOfferTravelId(null)}
        onSaved={() => loadPage(1, false)}
      />
      <TravelFinalizeModal
        open={finalizeTravel != null}
        travel={finalizeTravel}
        onClose={() => setFinalizeTravel(null)}
        onSaved={() => loadPage(1, false)}
      />
    </div>
  )
}

export function TravelsPage() {
  return <TravelsListPage mode="available" />
}

export function MyTravelsPage() {
  return <TravelsListPage mode="my" />
}
