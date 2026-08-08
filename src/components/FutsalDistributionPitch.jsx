/**
 * DistributionPitch — Canvas pitch component for event scatter telemetry.
 *
 * Plots each event as a line with arrowhead (when end coords exist) or a circle
 * (when end coords are null). Color is determined by outcome.
 *
 * Props:
 *   events     {MatchEvent[]}  — array of event objects from Supabase
 *   teamColor  {string}        — team accent color (kept for future use)
 *   playerName {string}        — player name shown in tooltip
 *   players    {Lineup[]}      — lineup array for receiver name lookup
 *   allTeamEvents {MatchEvent[]} — all team events for receiver inference
 */
import { useRef, useLayoutEffect, useState, useMemo } from 'react'
import { drawPitch } from '../utils/pitchRenderer.js'
import CanvasTooltip from './CanvasTooltip.jsx'

const ASPECT_RATIO = 105 / 68
const SUCCESS_OUTCOMES = ['Successful', 'Key Pass', 'Assist']
const COLOR_SUCCESS = '#06D6A0'
const COLOR_FAIL = '#D90429'

function mapCoords(x, y, w, h) {
  return {
    px: (x / 120) * w,
    py: (1 - y / 80) * h,   // y=0 is bottom in data → flip for screen
  }
}

function drawArrowhead(ctx, fromX, fromY, tipX, tipY) {
  const angle = Math.atan2(tipY - fromY, tipX - fromX)
  const baseHalf = 3
  const height = (Math.sqrt(3) / 2) * 6

  const tx = tipX
  const ty = tipY
  const bx = tipX - height * Math.cos(angle)
  const by = tipY - height * Math.sin(angle)
  const perpAngle = angle + Math.PI / 2
  const b1x = bx + baseHalf * Math.cos(perpAngle)
  const b1y = by + baseHalf * Math.sin(perpAngle)
  const b2x = bx - baseHalf * Math.cos(perpAngle)
  const b2y = by - baseHalf * Math.sin(perpAngle)

  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(b1x, b1y)
  ctx.lineTo(b2x, b2y)
  ctx.closePath()
  ctx.fill()
}

function buildPlayerMap(players = []) {
  const map = {}
  for (const p of players) {
    const id   = p.player_id
    const name = p.player?.player_name ?? p.player_name ?? null
    if (id && name) {
      const parts = name.trim().split(' ')
      map[id] = parts[parts.length - 1].toUpperCase()
    }
  }
  return map
}

function inferReceiver(passEvent, allTeamEvents, playerMap) {
  if (!passEvent.end_x || !passEvent.end_y) return null
  const T  = passEvent.match_time_seconds ?? 0
  const ex = passEvent.end_x
  const ey = passEvent.end_y
  for (const ev of allTeamEvents) {
    if (ev.player_id === passEvent.player_id) continue
    const t = ev.match_time_seconds ?? 0
    if (t < T || t > T + 8) continue
    if (Math.abs((ev.start_x ?? 0) - ex) < 10 && Math.abs((ev.start_y ?? 0) - ey) < 10) {
      return playerMap[ev.player_id] ?? null
    }
  }
  return null
}

export default function DistributionPitch({ events = [], teamColor, playerName, players = [], allTeamEvents = [] }) {
  const playerMap = useMemo(() => buildPlayerMap(players), [players])
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const hitRegionsRef = useRef([])

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, fields: [] })

  useLayoutEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function paintCanvas(w) {
      if (w <= 0) return
      const h = w / ASPECT_RATIO
      const dpr = window.devicePixelRatio || 1

      canvas.width  = w * dpr
      canvas.height = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      hitRegionsRef.current = []
      drawPitch(ctx, w, h)

      if (!events || events.length === 0) return

      events.forEach((event) => {
        const isSuccess = SUCCESS_OUTCOMES.includes(event.outcome)
        const color = isSuccess ? COLOR_SUCCESS : COLOR_FAIL

        const { px: sx, py: sy } = mapCoords(event.start_x, event.start_y, w, h)
        const hasEnd = event.end_x != null && event.end_y != null

        const receiverName =
          event.receiver_player_name ??
          event.pass_recipient_name ??
          (event.receiver_player_id ? playerMap[event.receiver_player_id] : null) ??
          (event.secondary_player_id ? playerMap[event.secondary_player_id] : null) ??
          inferReceiver(event, allTeamEvents, playerMap)

        if (hasEnd) {
          const { px: ex, py: ey } = mapCoords(event.end_x, event.end_y, w, h)
          ctx.save()
          ctx.globalAlpha = isSuccess ? 1.0 : 0.5
          ctx.strokeStyle = color
          ctx.fillStyle   = color
          ctx.lineWidth   = 1.5
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(ex, ey)
          ctx.stroke()
          drawArrowhead(ctx, sx, sy, ex, ey)
          ctx.restore()
          const midX = (sx + ex) / 2
          const midY = (sy + ey) / 2
          hitRegionsRef.current.push({ cx: midX, cy: midY, eventData: event, receiverName })
          hitRegionsRef.current.push({ cx: ex,   cy: ey,   eventData: event, receiverName })
        } else {
          ctx.save()
          ctx.globalAlpha = isSuccess ? 1.0 : 0.5
          ctx.fillStyle   = color
          ctx.beginPath()
          ctx.arc(sx, sy, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          hitRegionsRef.current.push({ cx: sx, cy: sy, eventData: event })
        }
      })
    }

    const initW = container.offsetWidth || container.getBoundingClientRect().width
    paintCanvas(initW)

    const observer = new ResizeObserver(([entry]) => {
      paintCanvas(entry.contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [events, playerMap, allTeamEvents])

  function handleMouseMove(e) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const regions = hitRegionsRef.current
    let nearest = null
    let nearestDist = Infinity

    for (const region of regions) {
      const dx = region.cx - mouseX
      const dy = region.cy - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = region
      }
    }

    if (nearest && nearestDist <= 8) {
      const ev = nearest.eventData
      const minutes = ev.match_time_seconds != null
        ? Math.floor(ev.match_time_seconds / 60) + "'"
        : 'N/A'

      const fields = [
        { label: 'ACTION',  value: ev.action ?? 'N/A' },
        { label: 'TIME',    value: minutes },
        { label: 'OUTCOME', value: ev.outcome ?? 'N/A' },
        { label: 'FROM',    value: playerName ?? ev.player_name ?? 'N/A' },
      ]
      if (nearest.receiverName) {
        fields.push({ label: 'TO', value: nearest.receiverName })
      }

      setTooltip({ visible: true, x: mouseX, y: mouseY, fields })
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }))
    }
  }

  function handleMouseLeave() {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  const containerWidth = containerRef.current?.offsetWidth ?? 0

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minHeight: 120 }}>
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
