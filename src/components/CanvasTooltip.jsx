/**
 * CanvasTooltip — Neo-Brutalist hover tooltip for Canvas pitch components.
 *
 * Renders an absolutely positioned overlay inside a `position: relative` container.
 * Automatically repositions to the left of the cursor when it would overflow the
 * right edge of the container.
 *
 * Props:
 *   visible        {boolean}              — show/hide the tooltip
 *   x              {number}               — cursor X relative to container
 *   y              {number}               — cursor Y relative to container
 *   fields         {Array<{label,value}>} — data rows to display
 *   containerWidth {number}               — container width for overflow detection
 */
import { useRef, useEffect, useState } from 'react'

export default function CanvasTooltip({ visible, x, y, fields = [], containerWidth }) {
  const tooltipRef = useRef(null)
  const [tooltipWidth, setTooltipWidth] = useState(0)

  // Measure the tooltip's actual rendered width after each render so the
  // overflow guard uses the real value rather than a hard-coded estimate.
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipWidth(tooltipRef.current.offsetWidth)
    }
  })

  // Overflow guard: flip to the left when the tooltip would exceed the container.
  const wouldOverflow = containerWidth != null && (x + tooltipWidth) > containerWidth
  const left = wouldOverflow ? x - tooltipWidth - 12 : x + 12
  const top = y - 12

  const style = {
    position: 'absolute',
    left,
    top,
    background: 'var(--color-accent)',
    border: 'var(--border-brutal)',
    boxShadow: 'var(--shadow-brutal)',
    fontFamily: 'monospace',
    fontWeight: 700,
    fontSize: '12px',
    padding: '8px 10px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 10,
    display: visible ? 'block' : 'none',
    lineHeight: '1.6',
    textTransform: 'uppercase',
  }

  return (
    <div ref={tooltipRef} style={style} role="tooltip" aria-hidden={!visible}>
      {fields.map(({ label, value }, i) => (
        <div key={i}>
          {String(label).toUpperCase()}: {String(value).toUpperCase()}
        </div>
      ))}
    </div>
  )
}
