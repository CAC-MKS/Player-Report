/**
 * AveragePositionsPitch — Canvas pitch component for tactical average positions.
 *
 * Plots each player as a filled circle at their average (start_x, start_y) position.
 * Circle color indicates team side; opacity indicates sample size confidence.
 *
 * Props:
 *   players {AvgPositionPlayer[]} — array of
 *     { playerId, name, jerseyNo, teamSide, events[] }
 */
import { useRef, useLayoutEffect, useState } from 'react'
import { drawPitch } from '../utils/pitchRenderer.js'
import CanvasTooltip from './CanvasTooltip.jsx'

const ASPECT_RATIO         = 105 / 68
const COLOR_HOME           = '#0077B6'
const COLOR_AWAY           = '#D90429'
const CIRCLE_RADIUS        = 14
const CIRCLE_RADIUS_HOVER  = 21
const HIT_RADIUS           = 8
const LOW_SAMPLE_THRESHOLD = 3
const LOW_SAMPLE_OPACITY   = 0.4

function mean(values) {
  if (!values || values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function mapCoords(x, y, w, h) {
  return {
    px: (x / 120) * w,
    py: (1 - y / 80) * h,   // y=0 is bottom in data → flip for screen
  }
}

export default function AveragePositionsPitch({ players = [] }) {
  const containerRef        = useRef(null)
  const canvasRef           = useRef(null)
  const hitRegionsRef       = useRef([])
  const hoveredPlayerIdRef  = useRef(null)
  const drawFnRef           = useRef(null)

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, fields: [] })

  useLayoutEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    function draw(ctx, w, h, hoveredPlayerId = null) {
      hitRegionsRef.current = []
      drawPitch(ctx, w, h)

      if (!players || players.length === 0) return

      players.forEach((player) => {
        const events = player.events ?? []
        const avgX   = mean(events.map((e) => e.start_x))
        const avgY   = mean(events.map((e) => e.start_y))

        const { px: cx, py: cy } = mapCoords(avgX, avgY, w, h)

        const color    = player.teamSide === 'home' ? COLOR_HOME : COLOR_AWAY
        const opacity  = events.length < LOW_SAMPLE_THRESHOLD ? LOW_SAMPLE_OPACITY : 1.0
        const isHovered = hoveredPlayerId === player.playerId
        const radius   = isHovered ? CIRCLE_RADIUS_HOVER : CIRCLE_RADIUS

        ctx.save()
        ctx.globalAlpha = opacity
        ctx.fillStyle   = color
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        ctx.save()
        ctx.globalAlpha    = opacity
        ctx.fillStyle      = '#FFFFFF'
        ctx.font           = 'bold 10px monospace'
        ctx.textAlign      = 'center'
        ctx.textBaseline   = 'middle'
        ctx.fillText(player.jerseyNo != null ? String(player.jerseyNo) : '', cx, cy)
        ctx.restore()

        hitRegionsRef.current.push({
          cx, cy,
          playerData: { ...player, avgX, avgY, eventCount: events.length },
        })
      })
    }

    drawFnRef.current = draw

    function paintCanvas(w) {
      if (w <= 0) return
      const h   = w / ASPECT_RATIO
      const dpr = window.devicePixelRatio || 1

      canvas.width  = w * dpr
      canvas.height = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      draw(ctx, w, h, hoveredPlayerIdRef.current)
    }

    const initW = container.offsetWidth || container.getBoundingClientRect().width
    paintCanvas(initW)

    const observer = new ResizeObserver(([entry]) => {
      paintCanvas(entry.contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [players])

  function redraw(hoveredPlayerId) {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = parseFloat(canvas.style.width)
    const h = parseFloat(canvas.style.height)
    if (!w || !h) return
    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawFnRef.current?.(ctx, w, h, hoveredPlayerId)
  }

  function handleMouseMove(e) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect   = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    let nearest = null
    let nearestDist = Infinity

    for (const region of hitRegionsRef.current) {
      const dx   = region.cx - mouseX
      const dy   = region.cy - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDist) { nearestDist = dist; nearest = region }
    }

    if (nearest && nearestDist <= HIT_RADIUS) {
      const pd = nearest.playerData
      if (hoveredPlayerIdRef.current !== pd.playerId) {
        hoveredPlayerIdRef.current = pd.playerId
        redraw(pd.playerId)
      }
      setTooltip({
        visible: true, x: mouseX, y: mouseY,
        fields: [
          { label: 'PLAYER', value: pd.name ?? 'N/A' },
          { label: 'AVG X',  value: pd.avgX.toFixed(1) },
          { label: 'AVG Y',  value: pd.avgY.toFixed(1) },
          { label: 'EVENTS', value: pd.eventCount },
        ],
      })
    } else {
      if (hoveredPlayerIdRef.current !== null) {
        hoveredPlayerIdRef.current = null
        redraw(null)
      }
      setTooltip((prev) => ({ ...prev, visible: false }))
    }
  }

  function handleMouseLeave() {
    if (hoveredPlayerIdRef.current !== null) {
      hoveredPlayerIdRef.current = null
      redraw(null)
    }
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  const containerWidth = containerRef.current?.offsetWidth ?? 0

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <CanvasTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        fields={tooltip.fields}
        containerWidth={containerWidth}
      />
    </div>
  )
}
