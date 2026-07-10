import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cooperativeService } from '@/services/cooperative.service'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import { applyOffset, loadMarkerOverrides, type MarkerOverrides } from '@/lib/map-marker-positions'
import type { CooperativeSummary } from '@/types'

const MIN_LNG = -57.6336
const MAX_LNG = -49.6849
const MIN_LAT = -27.0906
const MAX_LAT = -33.7528
const SVG_W = 515
const SVG_H = 493
const HALF_CM_PX = 18.9

const PIN_PATH =
  'M12.5811 2C10.7245 2 8.94406 2.7375 7.63131 4.05025C6.31855 5.36301 5.58105 7.14348 5.58105 9C5.58105 14.25 12.5811 22 12.5811 22C12.5811 22 19.5811 14.25 19.5811 9C19.5811 7.14348 18.8436 5.36301 17.5308 4.05025C16.218 2.7375 14.4376 2 12.5811 2Z'

function convertLngToX(lng: number) {
  return ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * SVG_W
}

function convertLatToY(lat: number) {
  return ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * SVG_H
}

function calcBasePosition(coop: CooperativeSummary, markerPositions: Map<string, number>) {
  let x = convertLngToX(Number(coop.city!.longitude)) - 12.5 - HALF_CM_PX
  let y = convertLatToY(Number(coop.city!.latitude)) - 24 + HALF_CM_PX

  const key = `${Math.round(x)}-${Math.round(y)}`
  const count = markerPositions.get(key) || 0
  if (count > 0) {
    const spacing = 20
    const angle = count * 60 * (Math.PI / 180)
    x += spacing * Math.cos(angle)
    y += spacing * Math.sin(angle)
  }
  markerPositions.set(key, count + 1)

  return { x, y }
}

function setMarkerCoords(
  marker: SVGGElement,
  logicalX: number,
  logicalY: number,
  pinW: number,
  pinH: number,
) {
  const tx = logicalX - (pinW - 25) / 2
  const ty = logicalY - (pinH - 24) / 2
  marker.setAttribute('transform', `translate(${tx}, ${ty})`)
}

function findMarkerFromPoint(clientX: number, clientY: number): SVGGElement | null {
  const el = document.elementFromPoint(clientX, clientY)
  let node: Element | null = el
  while (node) {
    if (node instanceof SVGGElement && node.classList.contains('map-marker')) {
      return node
    }
    node = node.parentElement ?? (node.parentNode as Element | null)
  }
  return null
}

function clearMarkerHighlight(marker: SVGGElement | null) {
  if (!marker) return
  const pinBody = marker.querySelector('.pin-body') as SVGGElement | null
  if (pinBody) pinBody.style.filter = ''
}

function buildPinMarkup(type: CooperativeSummary['type'], uid: number) {
  const isCentral = type === 'CENTRAL'
  const fill = isCentral ? '#32FFC5' : '#009640'
  const stroke = isCentral ? '#14b8a6' : '#007a35'
  const glow = isCentral ? 'rgba(50,255,197,0.45)' : 'rgba(0,150,64,0.4)'
  const w = isCentral ? 28 : 25
  const h = isCentral ? 27 : 24

  return {
    w,
    h,
    html: `
      <defs>
        <filter id="pin-shadow-${uid}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
        <radialGradient id="pin-grad-${uid}" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stop-color="${isCentral ? '#7dffe8' : '#4cd686'}"/>
          <stop offset="100%" stop-color="${fill}"/>
        </radialGradient>
      </defs>
      <path d="${PIN_PATH}" fill="transparent" class="pin-hit" pointer-events="visiblePainted"/>
      <g filter="url(#pin-shadow-${uid})" class="pin-body" pointer-events="none">
        <path d="${PIN_PATH}" fill="url(#pin-grad-${uid})" stroke="${stroke}" stroke-width="1.2"/>
        <ellipse cx="12.5811" cy="21.5" rx="5" ry="1.5" fill="${glow}" opacity="0.6"/>
      </g>
    `,
  }
}

interface RsMapProps {
  size?: 'default' | 'large'
}

export function RsMap({ size = 'default' }: RsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const markerPositions = useRef(new Map<string, number>())
  const coopByIdRef = useRef(new Map<number, CooperativeSummary>())
  const hoveredMarkerRef = useRef<SVGGElement | null>(null)
  const layerHandlersRef = useRef<{
    move: (e: PointerEvent) => void
    leave: () => void
    click: (e: PointerEvent) => void
  } | null>(null)

  const [cooperatives, setCooperatives] = useState<CooperativeSummary[]>([])
  const [svgHtml, setSvgHtml] = useState('')
  const [svgReady, setSvgReady] = useState(false)
  const [overrides, setOverrides] = useState<MarkerOverrides>({})

  const { isLoggedIn } = useAuth()
  const { openModal } = useModal()
  const navigate = useNavigate()

  useEffect(() => {
    loadMarkerOverrides().then(setOverrides)
  }, [])

  useEffect(() => {
    fetch('/assets/imgs/mapa_svg.svg')
      .then((r) => r.text())
      .then((html) => setSvgHtml(html))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const el = mapContainerRef.current
    if (!el || !svgHtml || el.querySelector('svg')) return
    el.innerHTML = svgHtml
    setSvgReady(true)
  }, [svgHtml])

  const showTooltip = (coop: CooperativeSummary, clientX: number, clientY: number) => {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const name = coop.fantasyName || coop.companyName
    const city = coop.city?.name ?? ''
    const uf = coop.city?.state?.abbreviation ?? 'RS'
    const typeLabel = coop.type === 'CENTRAL' ? 'Central' : 'Singular'
    const typeColor = coop.type === 'CENTRAL' ? '#32FFC5' : '#92D0B2'

    tooltip.innerHTML = `
      <p class="font-semibold text-white text-sm leading-snug">${name}</p>
      <p class="text-white/75 text-xs mt-0.5">${city}${city ? ', ' : ''}${uf}</p>
      <span class="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style="background:${typeColor}22;color:${typeColor}">${typeLabel}</span>
    `
    tooltip.style.left = `${clientX + 14}px`
    tooltip.style.top = `${clientY + 14}px`
    tooltip.classList.remove('invisible', 'opacity-0', 'scale-95')
    tooltip.classList.add('opacity-100', 'scale-100')
  }

  const hideTooltip = () => {
    const tooltip = tooltipRef.current
    if (!tooltip) return
    tooltip.classList.add('opacity-0', 'scale-95')
    tooltip.classList.remove('opacity-100', 'scale-100')
  }

  const navigateToCoop = useCallback(
    (id: number) => {
      if (isLoggedIn) {
        navigate(`/cooperativas?id=${id}`)
        return
      }
      openModal('login', {
        redirectToCooperatives: false,
        onSuccess: () => navigate(`/cooperativas?id=${id}`),
      })
    },
    [isLoggedIn, navigate, openModal],
  )

  const renderMarkers = useCallback(() => {
    const svgRoot = mapContainerRef.current?.querySelector('svg') as SVGSVGElement | null
    if (!svgRoot) return

    svgRoot.querySelectorAll('.map-marker').forEach((el) => el.remove())
    markerPositions.current.clear()

    let markersLayer = svgRoot.querySelector('#map-markers-layer') as SVGGElement | null
    if (!markersLayer) {
      markersLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      markersLayer.setAttribute('id', 'map-markers-layer')
      markersLayer.style.pointerEvents = 'all'
      svgRoot.appendChild(markersLayer)
    }

    cooperatives.forEach((coop) => {
      if (!coop.city?.latitude || !coop.city?.longitude) return

      const base = calcBasePosition(coop, markerPositions.current)
      const { x, y } = applyOffset(base.x, base.y, coop.id, overrides)
      const pin = buildPinMarkup(coop.type, coop.id)

      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      marker.setAttribute('class', 'map-marker')
      marker.setAttribute('data-coop-id', String(coop.id))
      setMarkerCoords(marker, x, y, pin.w, pin.h)
      marker.style.pointerEvents = 'none'
      marker.innerHTML = pin.html

      const pinHit = marker.querySelector('.pin-hit') as SVGPathElement | null
      if (pinHit) {
        pinHit.style.cursor = 'pointer'
        pinHit.style.pointerEvents = 'visiblePainted'
      }

      markersLayer.appendChild(marker)
    })

    coopByIdRef.current = new Map(cooperatives.map((c) => [c.id, c]))

    if (layerHandlersRef.current) {
      markersLayer.removeEventListener('pointermove', layerHandlersRef.current.move)
      markersLayer.removeEventListener('pointerleave', layerHandlersRef.current.leave)
      markersLayer.removeEventListener('click', layerHandlersRef.current.click)
      layerHandlersRef.current = null
    }

    const onPointerMove = (e: PointerEvent) => {
      const marker = findMarkerFromPoint(e.clientX, e.clientY)

      if (marker === hoveredMarkerRef.current) {
        if (marker) {
          const coop = coopByIdRef.current.get(Number(marker.getAttribute('data-coop-id')))
          if (coop) showTooltip(coop, e.clientX, e.clientY)
        }
        return
      }

      clearMarkerHighlight(hoveredMarkerRef.current)
      hoveredMarkerRef.current = marker

      if (!marker) {
        hideTooltip()
        return
      }

      const coopId = Number(marker.getAttribute('data-coop-id'))
      const coop = coopByIdRef.current.get(coopId)
      const pinBody = marker.querySelector('.pin-body') as SVGGElement | null

      if (coop && pinBody) {
        pinBody.style.filter = `url(#pin-shadow-${coopId}) brightness(1.12)`
        showTooltip(coop, e.clientX, e.clientY)
      }
    }

    const onPointerLeave = () => {
      clearMarkerHighlight(hoveredMarkerRef.current)
      hoveredMarkerRef.current = null
      hideTooltip()
    }

    const onClick = (e: PointerEvent) => {
      const marker = findMarkerFromPoint(e.clientX, e.clientY)
      if (!marker) return
      navigateToCoop(Number(marker.getAttribute('data-coop-id')))
    }

    markersLayer.addEventListener('pointermove', onPointerMove)
    markersLayer.addEventListener('pointerleave', onPointerLeave)
    markersLayer.addEventListener('click', onClick)
    layerHandlersRef.current = { move: onPointerMove, leave: onPointerLeave, click: onClick }
  }, [cooperatives, overrides, navigateToCoop])

  useEffect(() => {
    cooperativeService
      .getCooperatives()
      .then((data) => setCooperatives(Array.isArray(data) ? data : []))
      .catch(() => setCooperatives([]))
  }, [])

  useEffect(() => {
    if (svgReady && cooperatives.length > 0) {
      requestAnimationFrame(() => renderMarkers())
    }
  }, [svgReady, svgHtml, cooperatives, overrides, renderMarkers])

  const mapSizeClass =
    size === 'large'
      ? 'w-full max-w-[515px] mx-auto'
      : 'w-full max-w-[420px] mx-auto'

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className={`${mapSizeClass} [&_svg]:block [&_svg]:w-full [&_svg]:h-auto [&_svg]:overflow-visible`}
        aria-label="Mapa do Rio Grande do Sul com cooperativas"
      />

      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none invisible opacity-0 scale-95 transition-all duration-150 bg-ink/95 backdrop-blur-sm text-left px-3 py-2.5 rounded-xl shadow-xl border border-white/10 max-w-[220px]"
      />
    </div>
  )
}
