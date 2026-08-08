/**
 * ShotMapPitch — Canvas pitch component for shot map visualisation.
 *
 * Crops to the attacking half of the pitch and plots each shot as a circle
 * whose radius is proportional to xG. Goal shots are fully opaque with a 'G'
 * label; non-goal shots are semi-transparent.
 *
 * Props:
 *   shots {ShotEvent[]} — array of shot events:
 *     { start_x, start_y, xg, outcome, player_name, match_time_seconds }
 */
import { useRef, useLayoutEffect, useState } from 'react'
import { drawPitch, PITCH_DIMS } from '../utils/pitchRenderer.js'
import CanvasTooltip from './CanvasTooltip.jsx'

const SHOT_COLOR = '#0077B6'
const HIT_RADIUS = 8

// Standard pitch constants
const PITCH_W    = PITCH_DIMS.standard.W   // 105
const PITCH_H    = PITCH_DIMS.standard.H   // 68
const HALF_WIDTH = 52.5                    // attacking half width in metres
const ASPECT     = HALF_WIDTH / PITCH_H    // canvas aspect ratio

/**
 * Map database coordinates (120×80 space) to canvas pixels.
 * Canvas represents only the attacking half (x ≥ 52.5 m).
 */
function mapCoords(x, y, w, h) {
  const scaleX = w / HALF_WIDTH
  const pitchX = (x / 120) * PITCH_W
  const pitchY = (1 - y / 80) * PITCH_H   // y=0 is bottom in data → flip for screen
  return {
    px: (pitchX - HALF_WIDTH) * scaleX,
    py: pitchY * (h / PITCH_H),
  }
}

function shotRadius(xg) {
  const r = 4 + (xg ?? 0) * 14
  return Math.min(18, Math.max(4, r))
}

export default function ShotMapPitch({ shots = [], playerName }) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)
  const hitRegionsRef = useRef([])

  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, fields: [] })

  useLayoutEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    function paintCanvas(w) {
      if (w <= 0) return
      const h   = w / ASPECT
      const dpr = window.devicePixelRatio || 1

      canvas.width  = w * dpr
      canvas.height = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      hitRegionsRef.current = []

      // Draw the full pitch translated so only the right half is visible
      const scaleX = w / HALF_WIDTH
      const scaleY = h / PITCH_H
      ctx.save()
      ctx.translate(-HALF_WIDTH * scaleX, 0)
      drawPitch(ctx, PITCH_W * scaleX, PITCH_H * scaleY)
      ctx.restore()

      if (!shots || shots.length === 0) return

      shots.forEach((shot) => {
        const { px: cx, py: cy } = mapCoords(shot.start_x, shot.start_y, w, h)
        const r      = shotRadius(shot.xg ?? 0)
        const isGoal = shot.outcome === 'Goal'

        ctx.save()
        ctx.globalAlpha = isGoal ? 1.0 : 0.66
        ctx.lineWidth   = isGoal ? 3 : 1
        ctx.strokeStyle = '#000'
        ctx.fillStyle   = SHOT_COLOR

        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        if (isGoal) {
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `bold ${Math.max(8, Math.round(r * 0.9))}px monospace`
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('G', cx, cy)
        }

        ctx.restore()
        hitRegionsRef.current.push({ cx, cy, r, shotData: shot })
      })
    }

    const initW = container.offsetWidth || container.getBoundingClientRect().width
    paintCanvas(initW)

    const observer = new ResizeObserver(([entry]) => {
      paintCanvas(entry.contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [shots])

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
      const s = nearest.shotData
      const minutes = s.match_time_seconds != null
        ? Math.floor(s.match_time_seconds / 60) + "'"
        : 'N/A'
      setTooltip({
        visible: true, x: mouseX, y: mouseY,
        fields: [
          { label: 'PLAYER',  value: playerName ?? s.player_name ?? 'N/A' },
          { label: 'XG',      value: (s.xg ?? 0).toFixed(2) },
          { label: 'OUTCOME', value: s.outcome ?? 'N/A' },
          { label: 'MIN',     value: minutes },
        ],
      })
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }))
    }
  }

  function handleMouseLeave() {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }

  const containerWidth = containerRef.current?.offsetWidth ?? 0

  return (
    <div style={{ width: '100%' }}>
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

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center',
        padding: '8px 4px 4px', fontFamily: 'monospace',
        fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18">
            <circle cx="9" cy="9" r="7" fill={SHOT_COLOR} stroke="#000" strokeWidth="2" opacity="1" />
            <text x="9" y="9" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="monospace">G</text>
          </svg>
          <span>Goal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18">
            <circle cx="9" cy="9" r="7" fill={SHOT_COLOR} stroke="#000" strokeWidth="1" opacity="0.66" />
          </svg>
          <span>Missed / Saved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="36" height="18">
            <circle cx="5"  cy="9" r="4" fill={SHOT_COLOR} opacity="0.66" />
            <circle cx="27" cy="9" r="9" fill={SHOT_COLOR} opacity="0.66" />
          </svg>
          <span>Low → High xG</span>
        </div>
      </div>
    </div>
  )
}
