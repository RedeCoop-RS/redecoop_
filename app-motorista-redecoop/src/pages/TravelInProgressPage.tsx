import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ConfirmArrivalModal } from '@/components/ConfirmArrivalModal'
import { Button } from '@/components/ui/Button'
import { useLoading } from '@/contexts/LoadingContext'
import { useTravels } from '@/contexts/TravelsContext'
import { calculateFreeLoad, formatTravelDate, markCurrentRoutes } from '@/lib/travel'
import {
  attachInRoute,
  getDriverTravels,
  markArrivalRoute,
} from '@/services/driver.service'
import type { Travel, TravelRoute } from '@/types'

type ArrivalRoute = TravelRoute & { lastRoute?: boolean }

export function TravelInProgressPage() {
  const { travelId } = useParams<{ travelId: string }>()
  const navigate = useNavigate()
  const { show, hide } = useLoading()
  const { refresh: refreshTravels } = useTravels()

  const [travel, setTravel] = useState<Travel | null>(null)
  const [productsCollapsed, setProductsCollapsed] = useState<boolean[]>([])
  const [routeArrival, setRouteArrival] = useState<ArrivalRoute | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const loadTravel = useCallback(async () => {
    const id = Number(travelId)
    if (!id) return

    show()
    try {
      const travels = await getDriverTravels()
      const found = travels.find((t) => t.id === id)

      if (!found || found.status !== 'in_progress') {
        toast.error('Essa viagem não está mais em andamento!')
        navigate('/')
        return
      }

      const withRoutes = markCurrentRoutes(found)
      setTravel(withRoutes)
      setProductsCollapsed(withRoutes.travelRoutes.map(() => true))
    } catch {
      toast.error('Não foi possível carregar a viagem.')
      navigate('/')
    } finally {
      hide()
    }
  }, [travelId, navigate, show, hide])

  useEffect(() => {
    void loadTravel()
  }, [loadTravel])

  function openArrivalModal(stop: TravelRoute, lastRoute: boolean) {
    setRouteArrival({ ...stop, lastRoute })
  }

  async function handleConfirmArrival() {
    if (!routeArrival) return
    const { id, lastRoute } = routeArrival
    setRouteArrival(null)

    try {
      await markArrivalRoute(id)
      if (!lastRoute) {
        toast.success('Chegada na parada com sucesso!')
        await loadTravel()
        await refreshTravels()
      } else {
        toast.success('Viagem concluída!')
        await refreshTravels()
        navigate('/')
      }
    } catch {
      toast.error('Não foi possível registrar a chegada.')
    }
  }

  function triggerFileInput(index: number) {
    const input = fileInputRefs.current[index]
    if (!input) {
      toast.error('Houve um problema ao tentar anexar o arquivo nessa rota!')
      return
    }
    input.click()
  }

  async function onFileSelected(
    e: React.ChangeEvent<HTMLInputElement>,
    stopId: number,
  ) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    show()
    try {
      await attachInRoute(stopId, file)
      toast.success('Arquivo anexado!')
      await loadTravel()
    } catch {
      toast.error('Erro ao anexar arquivo')
    } finally {
      hide()
    }
  }

  function toggleProducts(index: number) {
    setProductsCollapsed((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  return (
    <>
      <div
        className="bg-section-mist min-h-dvh"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[var(--touch-target-min)] text-ink hover:text-green transition-smooth mb-4 -ml-1 px-1 rounded-xl"
          >
            <span className="material-icons text-[1.5rem]" aria-hidden="true">
              arrow_back
            </span>
            <span className="font-bold text-lg">Viagem em andamento</span>
          </Link>

          {travel && (
            <article className="glass-card rounded-2xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-50">
                <span className="flex items-center gap-2 font-bold text-sm text-grey-dark flex-wrap">
                  <span className="material-icons text-green text-[1.1rem]">event_note</span>
                  {formatTravelDate(travel.startDateTime)}
                </span>
                <p className="flex items-start gap-2 mt-1.5 text-xs text-grey-dark leading-relaxed flex-wrap">
                  <span className="material-icons text-[1rem] shrink-0 mt-0.5">local_shipping</span>
                  <span className="break-words">
                    {travel.vehicle?.model} — {travel.vehicle?.type?.name} —{' '}
                    {travel.vehicle?.licensePlate}
                  </span>
                </p>
              </div>

              <div className="p-4 sm:p-5">
                {travel.travelRoutes.map((stop, i, arr) => {
                  const last = i === arr.length - 1
                  const isCurrent = stop.currentRoute

                  return (
                    <div key={stop.id} className="flex items-start mb-2 last:mb-0">
                      <div className="stop-timeline__icon">
                        <div
                          className={`stop-timeline__dot${
                            isCurrent ? ' stop-timeline__dot--current' : ''
                          }${!isCurrent && !stop.arrivedAt ? ' stop-timeline__dot--muted' : ''}`}
                        >
                          {i + 1}
                        </div>
                        {!last && <div className="stop-timeline__line" />}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5 pb-5">
                        <p
                          className={`font-bold text-sm mb-1 break-words leading-snug ${
                            isCurrent ? 'text-green' : 'text-ink'
                          }`}
                        >
                          {stop.address}
                        </p>

                        {stop.offer && isCurrent && (
                          <p className="text-green text-sm font-medium mb-2">
                            {stop.offer.cooperative.name}
                          </p>
                        )}

                        {isCurrent && (
                          <div className="flex flex-col gap-2 mb-3">
                            <Button fullWidth onClick={() => openArrivalModal(stop, last)}>
                              Cheguei nesta parada
                            </Button>
                            <Button
                              variant="outline"
                              fullWidth
                              onClick={() => triggerFileInput(i)}
                            >
                              <span className="material-icons text-[1.25rem]">note_add</span>
                              {!stop.attachment ? 'Anexar comprovante' : 'Substituir arquivo'}
                            </Button>
                          </div>
                        )}

                        {stop.attachment && (
                          <p className="text-xs text-grey-dark mb-2 break-words bg-surface rounded-lg px-3 py-2">
                            <span className="material-icons text-[0.9rem] align-middle mr-1">
                              attach_file
                            </span>
                            {stop.attachment}
                          </p>
                        )}

                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          ref={(el) => {
                            fileInputRefs.current[i] = el
                          }}
                          onChange={(e) => onFileSelected(e, stop.id)}
                        />

                        <div className="flex flex-wrap items-center gap-3 text-xs text-grey-dark">
                          {!!stop.unloadingWeight && (
                            <span className="inline-flex items-center gap-0.5">
                              <span className="material-icons text-[0.9rem] text-red">
                                arrow_downward
                              </span>
                              {stop.unloadingWeight}
                            </span>
                          )}
                          {!!stop.loadingWeight && (
                            <span className="inline-flex items-center gap-0.5">
                              <span className="material-icons text-[0.9rem] text-green">
                                arrow_upward
                              </span>
                              {stop.loadingWeight}
                            </span>
                          )}
                          <span className="font-medium">Livre: {calculateFreeLoad(i, travel)}</span>
                        </div>

                        {!!stop.routeProduct?.length && (
                          <>
                            <div
                              className={`mt-3 rounded-xl overflow-hidden border border-gray-100 ${
                                productsCollapsed[i] ? 'hidden' : ''
                              }`}
                            >
                              <table className="w-full text-xs">
                                <tbody>
                                  {stop.routeProduct.map((product) => (
                                    <tr
                                      key={product.id}
                                      className="odd:bg-green-soft/30 even:bg-white"
                                    >
                                      <td className="px-3 py-2 break-words text-ink">
                                        {product.product.name}
                                      </td>
                                      <td className="px-3 py-2 text-grey-dark text-right whitespace-nowrap">
                                        <span className="material-icons text-[0.8rem] align-middle">
                                          arrow_downward
                                        </span>{' '}
                                        {product.unloadedWeight}
                                      </td>
                                      <td className="px-3 py-2 text-grey-dark text-right whitespace-nowrap">
                                        <span className="material-icons text-[0.8rem] align-middle">
                                          arrow_upward
                                        </span>{' '}
                                        {product.loadedWeight}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <button
                              type="button"
                              className="mt-2 flex items-center justify-center gap-1 w-full text-sm text-green font-medium py-2 hover:bg-green/5 rounded-xl transition-smooth"
                              onClick={() => toggleProducts(i)}
                            >
                              {productsCollapsed[i] ? 'Mostrar produtos' : 'Ocultar produtos'}
                              <span className="material-icons text-[1.1rem]">
                                {productsCollapsed[i] ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          )}
        </div>
      </div>

      <ConfirmArrivalModal
        open={!!routeArrival}
        route={routeArrival}
        onClose={() => setRouteArrival(null)}
        onConfirm={handleConfirmArrival}
      />
    </>
  )
}
