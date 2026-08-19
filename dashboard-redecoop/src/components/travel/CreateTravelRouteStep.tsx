import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { AddressAutocomplete } from '@/components/travel/AddressAutocomplete'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { mapService, type MapPlace } from '@/services/misc.service'
import { formatTravelStepDateTime } from '@/lib/travel'
import type { Driver, Vehicle } from '@/types'

export type TravelStopDraft = {
  address: string
  coordinates: { latitude: number; longitude: number }
  load: number
  unload: number
  distance: number
  order: number
}

export function CreateTravelRouteStep({
  date,
  hour,
  driver,
  vehicle,
  stops,
  onChange,
}: {
  date: string
  hour: string
  driver?: Driver | { name: string }
  vehicle?: Vehicle | { model?: string; maximumWeight?: number; volume?: number }
  stops: TravelStopDraft[]
  onChange: (stops: TravelStopDraft[]) => void
}) {
  const [from, setFrom] = useState<MapPlace | null>(null)
  const [fromLoad, setFromLoad] = useState('')
  const [to, setTo] = useState<MapPlace | null>(null)
  const [toLoad, setToLoad] = useState('')
  const [toUnload, setToUnload] = useState('')
  const [adding, setAdding] = useState(false)

  const maxWeight = Number(vehicle?.maximumWeight ?? 0)

  const currentLoad = stops.reduce((sum, stop) => sum + stop.load - stop.unload, 0)

  const freeAtStop = (index: number) => {
    let load = 0
    for (let i = 0; i <= index; i++) {
      load += stops[i].load - stops[i].unload
    }
    return maxWeight - load
  }

  const calcDistance = async (start: MapPlace['coordinates'], end: MapPlace['coordinates']) => {
    try {
      const distance = await mapService.distance(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude,
      )
      return Number(distance.toFixed(2))
    } catch {
      return 0
    }
  }

  const validateNextStop = (load: number, unload: number, baseLoad = currentLoad) => {
    if (load + baseLoad > maxWeight) {
      toast.error('Esta parada ultrapassa a carga máxima do caminhão.')
      return false
    }
    if (unload > baseLoad + load) {
      toast.error('Você não pode descarregar mais do que a carga carregada.')
      return false
    }
    return true
  }

  const addStop = async () => {
    if (!to) {
      toast.error('Informe o ponto de destino.')
      return
    }

    setAdding(true)
    try {
      const nextStops = [...stops]

      if (nextStops.length === 0) {
        if (!from) {
          toast.error('Informe o ponto de partida.')
          return
        }
        const initialLoad = Number(fromLoad) || 0
        if (!validateNextStop(initialLoad, 0, 0)) return

        nextStops.push({
          address: from.address,
          coordinates: from.coordinates,
          load: initialLoad,
          unload: 0,
          distance: 0,
          order: 1,
        })
      }

      const load = Number(toLoad) || 0
      const unload = Number(toUnload) || 0
      const baseLoad = nextStops.reduce((sum, stop) => sum + stop.load - stop.unload, 0)
      if (!validateNextStop(load, unload, baseLoad)) return

      const last = nextStops[nextStops.length - 1]
      const distance = await calcDistance(last.coordinates, to.coordinates)

      nextStops.push({
        address: to.address,
        coordinates: to.coordinates,
        load,
        unload,
        distance,
        order: nextStops.length + 1,
      })

      onChange(nextStops)
      setFrom(null)
      setFromLoad('')
      setTo(null)
      setToLoad('')
      setToUnload('')
      toast.success('Parada adicionada!')
    } finally {
      setAdding(false)
    }
  }

  const removeStop = (index: number) => {
    if (index === 0) return
    onChange(stops.filter((_, i) => i !== index).map((stop, i) => ({ ...stop, order: i + 1 })))
    toast.success('Parada removida.')
  }

  const lastStop = stops[stops.length - 1]

  return (
    <div className="travel-route-step">
      <div className="travel-route-step__summary">
        <h6>Detalhes</h6>
        <div className="travel-route-step__meta">
          <span>Status: Aguardando</span>
          {vehicle?.model && <span>Veículo: {vehicle.model}</span>}
          {driver?.name && <span>Motorista: {driver.name}</span>}
        </div>
        <span className="travel-route-step__date">{formatTravelStepDateTime(date, hour)}</span>
      </div>

      <div className="travel-route-step__builder">
        <h6>Trajeto</h6>
        <p className="travel-route-step__hint">
          Construa o trajeto, parada por parada, de forma sequencial. Deixe em branco para 0.
        </p>

        {stops.length === 0 ? (
          <>
            <AddressAutocomplete label="De:" value={from} onChange={setFrom} />
            <Input
              label="Carga inicial (kg)"
              type="number"
              value={fromLoad}
              onChange={(e) => setFromLoad(e.target.value)}
            />
          </>
        ) : (
          <div className="travel-route-step__last-stop">
            <span className="travel-route-step__last-label">De:</span>
            <strong>{lastStop.address}</strong>
            <div className="travel-route-step__weights">
              {lastStop.load > 0 && (
                <span>
                  <ArrowUp size={12} /> Carrega: {lastStop.load}kg
                </span>
              )}
              {lastStop.unload > 0 && (
                <span>
                  <ArrowDown size={12} /> Descarrega: {lastStop.unload}kg
                </span>
              )}
            </div>
          </div>
        )}

        <AddressAutocomplete label="Até:" value={to} onChange={setTo} />
        <div className="travel-route-step__inputs">
          <Input
            label="Carrega (kg)"
            type="number"
            value={toLoad}
            onChange={(e) => setToLoad(e.target.value)}
          />
          <Input
            label="Descarrega (kg)"
            type="number"
            value={toUnload}
            onChange={(e) => setToUnload(e.target.value)}
          />
        </div>

        <Button type="button" className="travel-route-step__add" onClick={addStop} disabled={adding}>
          {adding ? 'Calculando rota...' : 'Adicionar parada'}
        </Button>
      </div>

      {stops.length > 0 && (
        <div className="travel-route-step__timeline">
          {stops.map((stop, index) => (
            <div key={`${stop.order}-${stop.address}`} className="travel-route-step__item">
              <div className="travel-route-step__item-distance">
                {index < stops.length - 1 ? `${stops[index + 1].distance}km` : ''}
              </div>
              <div className="travel-route-step__item-dot" />
              <div className="travel-route-step__item-body">
                <div className="travel-route-step__item-head">
                  <strong title={stop.address}>
                    {stop.address.length > 40 ? `${stop.address.slice(0, 40)}…` : stop.address}
                  </strong>
                  {index > 0 && (
                    <button type="button" className="travel-route-step__remove" onClick={() => removeStop(index)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="travel-route-step__item-meta">
                  {stop.load > 0 && (
                    <span>
                      <ArrowUp size={12} /> {stop.load}
                    </span>
                  )}
                  {stop.unload > 0 && (
                    <span>
                      <ArrowDown size={12} /> {stop.unload}
                    </span>
                  )}
                  <span>LIVRE: {freeAtStop(index)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
