export interface MarkerOffset {
  dx: number
  dy: number
}

export type MarkerOverrides = Record<string, MarkerOffset>

const STORAGE_KEY = 'redecoop-map-marker-overrides'

export async function loadMarkerOverrides(): Promise<MarkerOverrides> {
  let fromFile: MarkerOverrides = {}

  try {
    const res = await fetch('/map-marker-overrides.json')
    if (res.ok) {
      fromFile = (await res.json()) as MarkerOverrides
    }
  } catch {
    /* ignore */
  }

  let fromStorage: MarkerOverrides = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) fromStorage = JSON.parse(raw) as MarkerOverrides
  } catch {
    /* ignore */
  }

  return { ...fromFile, ...fromStorage }
}

export function saveMarkerOverridesLocal(overrides: MarkerOverrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides, null, 2))
}

export function downloadMarkerOverrides(overrides: MarkerOverrides) {
  const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'map-marker-overrides.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyMarkerOverrides(overrides: MarkerOverrides) {
  await navigator.clipboard.writeText(JSON.stringify(overrides, null, 2))
}

export function resetMarkerOverridesLocal() {
  localStorage.removeItem(STORAGE_KEY)
}

export function mergeMarkerOverride(
  overrides: MarkerOverrides,
  coopId: number,
  dx: number,
  dy: number,
): MarkerOverrides {
  return {
    ...overrides,
    [String(coopId)]: { dx: Math.round(dx), dy: Math.round(dy) },
  }
}

export function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const svgPt = pt.matrixTransform(ctm.inverse())
  return { x: svgPt.x, y: svgPt.y }
}

export function applyOffset(
  x: number,
  y: number,
  coopId: number,
  overrides: MarkerOverrides,
): { x: number; y: number } {
  const o = overrides[String(coopId)]
  if (!o) return { x, y }
  return { x: x + o.dx, y: y + o.dy }
}
