/**
 * pitchRenderer.js
 * Pure canvas utility for drawing football pitches.
 * No React dependency — usable in any canvas context.
 */

export const PITCH_DIMS = {
  standard: { W: 105, H: 68 },
}

/**
 * Draw a football pitch onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width  - canvas logical width in pixels
 * @param {number} height - canvas logical height in pixels
 * @param {boolean} flipX - mirror the pitch horizontally (for R2L teams)
 */
export function drawPitch(ctx, width, height, flipX = false) {
  if (!ctx) return

  const { W, H } = PITCH_DIMS.standard
  const scaleX = width / W
  const scaleY = height / H

  // Helper: convert pitch-space metres → canvas pixels
  const px = (x) => x * scaleX
  const py = (y) => y * scaleY

  if (flipX) {
    ctx.save()
    ctx.transform(-1, 0, 0, 1, width, 0)
  }

  // ── Fill pitch ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#F4F4F4'
  ctx.fillRect(0, 0, width, height)

  // ── Stroke settings ─────────────────────────────────────────────────────────
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = Math.max(1, width / 400)

  drawStandardMarkings(ctx, px, py, width)

  if (flipX) {
    ctx.restore()
  }
}

function drawStandardMarkings(ctx, px, py, width) {
  // Outer boundary
  ctx.strokeRect(px(0), py(0), px(105), py(68))

  // Halfway line
  ctx.beginPath()
  ctx.moveTo(px(52.5), py(0))
  ctx.lineTo(px(52.5), py(68))
  ctx.stroke()

  // Centre circle (r = 9.15 m)
  ctx.beginPath()
  ctx.arc(px(52.5), py(34), px(9.15), 0, Math.PI * 2)
  ctx.stroke()

  // Centre spot (filled, r = 0.3 m)
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(px(52.5), py(34), px(0.3), 0, Math.PI * 2)
  ctx.fill()

  // Left penalty area: (0, 13.84) → (16.5, 54.16)
  ctx.strokeRect(px(0), py(13.84), px(16.5), py(40.32))

  // Right penalty area: (88.5, 13.84) → (105, 54.16)
  ctx.strokeRect(px(88.5), py(13.84), px(16.5), py(40.32))

  // Left 6-yard box: (0, 24.84) → (5.5, 43.16)
  ctx.strokeRect(px(0), py(24.84), px(5.5), py(18.32))

  // Right 6-yard box: (99.5, 24.84) → (105, 43.16)
  ctx.strokeRect(px(99.5), py(24.84), px(5.5), py(18.32))

  // Left penalty spot (filled, r = 0.3 m) at (11, 34)
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(px(11), py(34), px(0.3), 0, Math.PI * 2)
  ctx.fill()

  // Right penalty spot (filled, r = 0.3 m) at (94, 34)
  ctx.beginPath()
  ctx.arc(px(94), py(34), px(0.3), 0, Math.PI * 2)
  ctx.fill()

  // Left penalty arc
  const leftArcAngle = Math.acos(5.5 / 9.15)
  ctx.beginPath()
  ctx.arc(px(11), py(34), px(9.15), -leftArcAngle, leftArcAngle)
  ctx.stroke()

  // Right penalty arc
  const rightArcAngle = Math.acos(5.5 / 9.15)
  ctx.beginPath()
  ctx.arc(px(94), py(34), px(9.15), Math.PI - rightArcAngle, Math.PI + rightArcAngle)
  ctx.stroke()

  // Goals — drawn protruding outward
  ctx.fillStyle = '#dddddd'
  ctx.fillRect(px(0), py(30.34), px(2.44), py(7.32))
  ctx.strokeRect(px(0), py(30.34), px(2.44), py(7.32))
  ctx.fillRect(px(105 - 2.44), py(30.34), px(2.44), py(7.32))
  ctx.strokeRect(px(105 - 2.44), py(30.34), px(2.44), py(7.32))
  ctx.lineWidth = Math.max(2, width / 200)
  ctx.beginPath(); ctx.moveTo(px(0), py(30.34)); ctx.lineTo(px(0), py(37.66)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(px(105), py(30.34)); ctx.lineTo(px(105), py(37.66)); ctx.stroke()
  ctx.lineWidth = Math.max(1, width / 400)

  // Corner arcs (r = 1 m, quarter circles)
  ctx.beginPath()
  ctx.arc(px(0), py(0), px(1), 0, Math.PI / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(px(105), py(0), px(1), Math.PI / 2, Math.PI)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(px(0), py(68), px(1), -Math.PI / 2, 0)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(px(105), py(68), px(1), Math.PI, (3 * Math.PI) / 2)
  ctx.stroke()
}
