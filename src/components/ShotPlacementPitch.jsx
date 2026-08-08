/**
 * ShotPlacementPitch — Canvas goalmouth view for shot placement visualisation.
 *
 * Renders a 2D frontal view of the goal (7.32 m wide × 2.44 m tall) and plots
 * each shot as a circle positioned by its goal_y (horizontal) and goal_z
 * (vertical) coordinates. Shots with null goal_y or goal_z are filtered out.
 *
 * Props:
 *   shots {ShotEvent[]} — array of shot events:
 *     { goal_y, goal_z, outcome, player_name, match_time_seconds }
 */
import { useRef, useEffect, useState } from 'react'
import CanvasTooltip from './CanvasTooltip.jsx'

// Goal real-world dimensions (metres)
const GOAL_WIDTH = 7.32
const GOAL_HEIGHT = 2.44

// Canvas aspect ratio: goal width / goal height ≈ 3:1, with padding
const ASPECT_RATIO = GOAL_WIDTH / GOAL_HEIGHT

// Padding in logical pixels on each side
const PADDING = 20

// Shot circle radius in logical pixels
const SHOT_RADIUS = 8

// Hit-test radius in logical pixels
const HIT_RADIUS = 8

// Shot colors
const COLOR_GOAL = '#06D6A0'
const COLOR_NON_GOAL = '#D90429'

/**
 * Map goal coordinates to canvas pixels.
 *
 * @param {number} goalY  - horizontal position (0–7.32 m, left to right)
 * @param {number} goalZ  - vertical position (0–2.44 m, ground to crossbar)
 * @param {number} w      - canvas logical width
 * @param {number} h      - canvas logical height
 * @param {number} pad    - padding in pixels
 */
function mapCoords(goalY, goalZ, w, h, pad) {
  const px = pad + (goalY / GOAL_WIDTH) * (w - 2 * pad)
  const py = h - pad - (goalZ / GOAL_HEIGHT) * (h - 2 * pad)
  return { px, py }
}

/**
 * Determine fill color and alpha for a shot based on outcome.
 */
function shotStyle(outcome) {
  const isGoal = outcome === 'Goal'
  return {
    fillStyle: isGoal ? COLOR_GOAL : COLOR_NON_GOAL,
    globalAlpha: isGoal ? 1.0 : 0.66,
  }
}

export default function ShotPlacementPitch({ shots = [] }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const hitRegionsRef = useRef([])

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    fields: [],
  })

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function draw(ctx, w, h) {
      hitRegionsRef.current = []

      // ── Background ──────────────────────────────────────────────────────────
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, w, h)

      // ── Goal frame ──────────────────────────────────────────────────────────
      ctx.save()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineCap = 'square'

      // Left post: bottom-left to top-left
      ctx.beginPath()
      ctx.moveTo(PADDING, h - PADDING)
      ctx.lineTo(PADDING, PADDING)
      ctx.stroke()

      // Right post: bottom-right to top-right
      ctx.beginPath()
      ctx.moveTo(w - PADDING, h - PADDING)
      ctx.lineTo(w - PADDING, PADDING)
      ctx.stroke()

      // Crossbar: top-left to top-right
      ctx.beginPath()
      ctx.moveTo(PADDING, PADDING)
      ctx.lineTo(w - PADDING, PADDING)
      ctx.stroke()

      // Ground line: full width at bottom
      ctx.beginPath()
      ctx.moveTo(0, h - PADDING)
      ctx.lineTo(w, h - PADDING)
      ctx.stroke()

      ctx.restore()

      // ── Shot circles ────────────────────────────────────────────────────────
      // Filter out shots with null goal_y or goal_z
      const validShots = (shots ?? []).filter(
        (s) => s.goal_y != null && s.goal_z != null
      )

      validShots.forEach((shot) => {
        const { px: cx, py: cy } = mapCoords(shot.goal_y, shot.goal_z, w, h, PADDING)
        const { fillStyle, globalAlpha } = shotStyle(shot.outcome)

        ctx.save()
        ctx.globalAlpha = globalAlpha
        ctx.fillStyle = fillStyle
        ctx.beginPath()
        ctx.arc(cx, cy, SHOT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Register hit region
        hitRegionsRef.current.push({ cx, cy, shotData: shot })
      })
    }

    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w === 0) return

      const h = w / ASPECT_RATIO
      const dpr = window.devicePixelRatio || 1

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      draw(ctx, w, h)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [shots])

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

    if (nearest && nearestDist <= HIT_RADIUS) {
      const s = nearest.shotData
      const minutes =
        s.match_time_seconds != null
          ? Math.floor(s.match_time_seconds / 60) + "'"
          : 'N/A'

      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        fields: [
          { label: 'PLAYER', value: s.player_name ?? 'N/A' },
          { label: 'OUTCOME', value: s.outcome ?? 'N/A' },
          { label: 'MIN', value: minutes },
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
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
    >
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
