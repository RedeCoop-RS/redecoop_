import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { AddressAutocomplete } from '@/components/travel/AddressAutocomplete'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { mapService, type MapPlace } from '@/services/misc.service'
import type { Travel, TravelRoute } from '@/types'

export type OfferProductDraft = { productId: number; weight: number }

export type OfferStopDraft = {
  address: string
  coordinates: { latitude: number; longitude: number }
  productsLoad: OfferProductDraft[]
  productsUnload: OfferProductDraft[]
  distance: number
  order: number
}

type CatalogProduct = { id: number; name: string }

function productLabel(products: CatalogProduct[], productId: number) {
  return products.find((p) => p.id === productId)?.name ?? `Produto #${productId}`
}

function productMapAtStops(stops: OfferStopDraft[], products: CatalogProduct[]) {
  const map: Record<number, number> = {}
  stops.forEach((stop) => {
    stop.productsLoad.forEach((p) => {
      map[p.productId] = (map[p.productId] ?? 0) + p.weight
    })
    stop.productsUnload.forEach((p) => {
      map[p.productId] = (map[p.productId] ?? 0) - p.weight
    })
  })
  return Object.entries(map)
    .filter(([, weight]) => weight > 0)
    .map(([id, weight]) => `${weight}Kg de ${productLabel(products, Number(id))}`)
}

export function TravelOfferRouteStep({
  travel,
  products,
  stops,
  onChange,
}: {
  travel: Travel
  products: CatalogProduct[]
  stops: OfferStopDraft[]
  onChange: (stops: OfferStopDraft[]) => void
}) {
  const [from, setFrom] = useState<MapPlace | null>(null)
  const [to, setTo] = useState<MapPlace | null>(null)
  const [fromProducts, setFromProducts] = useState<OfferProductDraft[]>([{ productId: 0, weight: 0 }])
  const [toLoadProducts, setToLoadProducts] = useState<OfferProductDraft[]>([{ productId: 0, weight: 0 }])
  const [toUnloadProducts, setToUnloadProducts] = useState<OfferProductDraft[]>([{ productId: 0, weight: 0 }])
  const [adding, setAdding] = useState(false)

  const originalRoutes = travel.travelRoutes ?? travel.routes ?? []

  const remainingAtLastOriginal = () => {
    if (!originalRoutes.length) return 0
    return originalRoutes[originalRoutes.length - 1]?.remainingCapacity ?? 0
  }

  const totalLoadInProposal = () => {
    const map: Record<number, number> = {}
    stops.forEach((stop) => {
      stop.productsLoad.forEach((p) => {
        map[p.productId] = (map[p.productId] ?? 0) + p.weight
      })
      stop.productsUnload.forEach((p) => {
        map[p.productId] = (map[p.productId] ?? 0) - p.weight
      })
    })
    return Object.values(map).reduce((sum, w) => sum + Math.max(0, w), 0)
  }

  const cleanProducts = (items: OfferProductDraft[]) =>
    items.filter((item) => item.productId && item.weight > 0)

  const updateProductRow = (
    items: OfferProductDraft[],
    setItems: (v: OfferProductDraft[]) => void,
    index: number,
    field: 'productId' | 'weight',
    value: string,
  ) => {
    const next = [...items]
    next[index] = {
      ...next[index],
      [field]: field === 'productId' ? Number(value) : Number(value),
    }
    setItems(next)
  }

  const productRows = (
    label: string,
    items: OfferProductDraft[],
    setItems: (v: OfferProductDraft[]) => void,
  ) => (
    <div className="travel-offer-products">
      <div className="travel-offer-products__head">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setItems([...items, { productId: 0, weight: 0 }])}
          className="travel-offer-products__add"
        >
          <Plus size={14} /> Produto
        </button>
      </div>
      {items.map((item, index) => (
        <div key={`${label}-${index}`} className="travel-offer-products__row">
          <Select
            value={item.productId || ''}
            onChange={(e) => updateProductRow(items, setItems, index, 'productId', e.target.value)}
            placeholder="Produto"
            options={products.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Input
            type="number"
            value={item.weight || ''}
            onChange={(e) => updateProductRow(items, setItems, index, 'weight', e.target.value)}
            placeholder="Kg"
          />
          {items.length > 1 && (
            <button
              type="button"
              className="travel-offer-products__remove"
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )

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

  const addStop = async () => {
    if (!to) {
      toast.error('Informe o ponto de destino.')
      return
    }

    const loadItems = cleanProducts(toLoadProducts)
    const unloadItems = cleanProducts(toUnloadProducts)
    const fromItems = cleanProducts(fromProducts)

    const nextTotal =
      totalLoadInProposal() +
      loadItems.reduce((s, p) => s + p.weight, 0) -
      unloadItems.reduce((s, p) => s + p.weight, 0)

    if (nextTotal > remainingAtLastOriginal()) {
      toast.error('Carga informada ultrapassa a carga livre do caminhão.')
      return
    }

    setAdding(true)
    try {
      const next = [...stops]

      if (next.length === 0) {
        if (!from) {
          toast.error('Informe o ponto de partida e o destino.')
          return
        }
        next.push({
          address: from.address,
          coordinates: from.coordinates,
          productsLoad: fromItems,
          productsUnload: [],
          distance: 0,
          order: 1,
        })
      }

      const last = next[next.length - 1]
      const distance = await calcDistance(last.coordinates, to.coordinates)
      next.push({
        address: to.address,
        coordinates: to.coordinates,
        productsLoad: loadItems,
        productsUnload: unloadItems,
        distance,
        order: next.length + 1,
      })

      onChange(next)
      setFrom(null)
      setTo(null)
      setFromProducts([{ productId: 0, weight: 0 }])
      setToLoadProducts([{ productId: 0, weight: 0 }])
      setToUnloadProducts([{ productId: 0, weight: 0 }])
      toast.success('Parada adicionada à proposta!')
    } finally {
      setAdding(false)
    }
  }

  const inLoadSummary = productMapAtStops(stops, products)

  return (
    <div className="travel-offer-step">
      <h6>Proposta</h6>
      <p className="travel-route-step__hint">
        Construa o <strong>seu</strong> trajeto, parada por parada, com produtos da sua cooperativa.
      </p>

      {stops.length === 0 ? (
        <>
          <AddressAutocomplete label="De:" value={from} onChange={setFrom} />
          {productRows('Carrega na origem', fromProducts, setFromProducts)}
        </>
      ) : (
        <div className="travel-route-step__last-stop">
          <span className="travel-route-step__last-label">De:</span>
          <strong>{stops[stops.length - 1].address}</strong>
          {inLoadSummary.length > 0 && (
            <div className="travel-offer-step__in-load">
              Em carga: {inLoadSummary.join(', ')}
            </div>
          )}
        </div>
      )}

      <AddressAutocomplete label="Até:" value={to} onChange={setTo} />
      {productRows('Carrega', toLoadProducts, setToLoadProducts)}
      {productRows('Descarrega', toUnloadProducts, setToUnloadProducts)}

      <Button type="button" className="travel-route-step__add" onClick={addStop} disabled={adding}>
        {adding ? 'Calculando rota...' : 'Adicionar parada'}
      </Button>

      {stops.length > 0 && (
        <div className="travel-offer-step__stops">
          {stops.map((stop, index) => (
            <div key={`${stop.order}-${stop.address}`} className="travel-offer-step__stop">
              <strong>
                {index + 1}. {stop.address}
              </strong>
              <div className="travel-offer-step__stop-meta">
                {stop.distance > 0 && <span>{stop.distance}km</span>}
                {stop.productsLoad.map((p) => (
                  <span key={`l-${p.productId}`}>
                    ↑ {p.weight}kg {productLabel(products, p.productId)}
                  </span>
                ))}
                {stop.productsUnload.map((p) => (
                  <span key={`u-${p.productId}`}>
                    ↓ {p.weight}kg {productLabel(products, p.productId)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function OriginalRoutePreview({ routes }: { routes?: TravelRoute[] }) {
  if (!routes?.length) return null
  return (
    <details className="travel-view-accordion" open>
      <summary>Trajeto original</summary>
      <div className="travel-view-accordion__body">
        {routes.map((stop, index) => (
          <div key={`${stop.order}-${index}`} className="travel-offer-step__stop">
            <strong>
              {stop.order}. {stop.address}
            </strong>
            <div className="travel-offer-step__stop-meta">
              {stop.loadingWeight != null && <span>↑ {stop.loadingWeight}</span>}
              {stop.unloadingWeight != null && <span>↓ {stop.unloadingWeight}</span>}
              {stop.remainingCapacity != null && <span>LIVRE: {stop.remainingCapacity}</span>}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
