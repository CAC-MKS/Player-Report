import Pitch from './Pitch.jsx'

const COLS = 24, ROWS = 16 // 5×5 unit cells on 120×80 pitch

export default function HeatMap({ events, teamColor, title = 'Touch Heatmap' }) {
  // Build grid
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0))

  for (const ev of events) {
    const col = Math.min(Math.floor(ev.start_x / 5), COLS - 1)
    const row = Math.min(Math.floor(ev.start_y / 5), ROWS - 1)
    if (col >= 0 && row >= 0) grid[row][col]++
  }

  const maxCount = Math.max(...grid.flat(), 1)

  return (
    <div>
      <p style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--black)' }}>
        {title} <span style={{ fontWeight: 400, opacity: 0.6 }}>({events.length} touches)</span>
      </p>
      <Pitch>
        {grid.map((row, ri) =>
          row.map((count, ci) => {
            if (count === 0) return null
            const opacity = Math.pow(count / maxCount, 0.6) * 0.85
            // y=0 is bottom in data; SVG y=0 is top → flip row index
            const svgY = (ROWS - 1 - ri) * 5
            return (
              <rect
                key={`${ri}-${ci}`}
                x={ci * 5}
                y={svgY}
                width={5}
                height={5}
                fill={teamColor}
                fillOpacity={opacity}
                rx={0.3}
              />
            )
          })
        )}
        {/* Tooltip hint circles for high-density areas */}
        {grid.map((row, ri) =>
          row.map((count, ci) => {
            if (count < maxCount * 0.7) return null
            const svgY = (ROWS - 1 - ri) * 5
            return (
              <text
                key={`t-${ri}-${ci}`}
                x={ci * 5 + 2.5}
                y={svgY + 3.2}
                textAnchor="middle"
                fontSize={2}
                fill="white"
                fontWeight="bold"
              >
                {count}
              </text>
            )
          })
        )}
      </Pitch>
    </div>
  )
}
