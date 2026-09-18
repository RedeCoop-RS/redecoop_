import { useEffect, useRef } from 'react'

interface HeatCell {
  xPct: number
  yPct: number
  hits: number
}

interface HeatmapCanvasProps {
  cells: HeatCell[]
}

function colorAt(t: number): [number, number, number, number] {
  const stops: [number, number, number, number, number][] = [
    [0, 59, 130, 246, 0],
    [0.25, 14, 165, 233, 90],
    [0.5, 34, 197, 94, 140],
    [0.75, 250, 204, 21, 180],
    [1, 239, 68, 68, 210],
  ]
  const clamped = Math.min(1, Math.max(0, t))
  let i = 0
  while (i < stops.length - 1 && clamped > stops[i + 1][0]) i += 1
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  const span = b[0] - a[0] || 1
  const p = (clamped - a[0]) / span
  return [
    Math.round(a[1] + (b[1] - a[1]) * p),
    Math.round(a[2] + (b[2] - a[2]) * p),
    Math.round(a[3] + (b[3] - a[3]) * p),
    Math.round(a[4] + (b[4] - a[4]) * p),
  ]
}

export function HeatmapCanvas({ cells }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 360
    const cssH = canvas.clientHeight || 640
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    ctx.fillStyle = '#f8fafb'
    ctx.fillRect(0, 0, cssW, cssH)
    ctx.strokeStyle = '#e8ecf0'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      const y = (cssH / 4) * i
      ctx.beginPath()
      ctx.moveTo(16, y)
      ctx.lineTo(cssW - 16, y)
      ctx.stroke()
    }

    if (cells.length === 0) return

    const maxHits = Math.max(...cells.map((c) => c.hits), 1)
    const radius = Math.max(28, Math.min(cssW, cssH) * 0.12)

    for (const cell of cells) {
      const x = (cell.xPct / 100) * cssW
      const y = (cell.yPct / 100) * cssH
      const t = Math.pow(cell.hits / maxHits, 0.55)
      const [r, g, b, a] = colorAt(t)
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(${r},${g},${b},${a / 255})`)
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [cells])

  return (
    <div className="site-heat__frame">
      <canvas ref={canvasRef} className="site-heat__canvas" />
      <div className="site-heat__guides" aria-hidden>
        <span>Topo</span>
        <span>Meio</span>
        <span>Rodapé</span>
      </div>
    </div>
  )
}
