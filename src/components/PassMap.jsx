import Pitch from './Pitch.jsx'

const SUCCESS = ['Successful', 'Key Pass', 'Assist']

export default function PassMap({ passes, title = 'Pass Map' }) {
  const complete = passes.filter(e => SUCCESS.includes(e.outcome))
  const incomplete = passes.filter(e => !SUCCESS.includes(e.outcome))

  const fy = (y) => 80 - y  // data y=0 is bottom; SVG y=0 is top

  const renderPasses = (list, color, opacity = 0.75) =>
    list.map((p, i) => {
      if (p.end_x == null || p.end_y == null) return null
      const dx = p.end_x - p.start_x
      const dy = p.end_y - p.start_y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const ax = p.end_x - (dx / len) * 1.5
      const ay = p.end_y - (dy / len) * 1.5
      return (
        <g key={i} opacity={opacity}>
          <line
            x1={p.start_x} y1={fy(p.start_y)}
            x2={ax} y2={fy(ay)}
            stroke={color} strokeWidth={0.5}
          />
          <polygon
            points={arrowHead(p.start_x, fy(p.start_y), p.end_x, fy(p.end_y), 1.2)}
            fill={color}
          />
          <circle cx={p.start_x} cy={fy(p.start_y)} r={0.5} fill={color} />
        </g>
      )
    })

  return (
    <div>
      <p style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--black)' }}>
        {title}
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 11, fontFamily: 'var(--font)' }}>
        <span><span style={{ color: '#09D69F', fontWeight: 700 }}>■</span> Complete ({complete.length})</span>
        <span><span style={{ color: '#D90429', fontWeight: 700 }}>■</span> Incomplete ({incomplete.length})</span>
      </div>
      <Pitch>
        {renderPasses(incomplete, '#D90429', 0.5)}
        {renderPasses(complete, '#09D69F', 0.7)}
        {/* Key passes & assists highlighted */}
        {passes.filter(e => ['Key Pass', 'Assist'].includes(e.outcome)).map((p, i) =>
          p.end_x != null ? (
            <circle key={`kp-${i}`} cx={p.end_x} cy={fy(p.end_y)} r={1.5}
              fill="gold" stroke="white" strokeWidth={0.3} opacity={0.9} />
          ) : null
        )}
      </Pitch>
      <p style={{ fontSize: 10, fontFamily: 'var(--font)', opacity: 0.6, marginTop: 4 }}>
        ★ Gold dot = Key Pass / Assist end point
      </p>
    </div>
  )
}

function arrowHead(x1, y1, x2, y2, size) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const spread = Math.PI / 6
  const ax = x2 - size * Math.cos(angle - spread)
  const ay = y2 - size * Math.sin(angle - spread)
  const bx = x2 - size * Math.cos(angle + spread)
  const by = y2 - size * Math.sin(angle + spread)
  return `${x2},${y2} ${ax},${ay} ${bx},${by}`
}
