import Pitch from './Pitch.jsx'

export default function ShotMap({ shots, title = 'Shot Map' }) {
  if (!shots || shots.length === 0) return null

  const maxXG = Math.max(...shots.map(s => s.xg), 0.01)

  const color = (outcome) => {
    if (outcome === 'Goal') return '#09D69F'
    if (['Save'].includes(outcome)) return '#FFD166'
    return 'rgba(255,255,255,0.4)'
  }
  const stroke = (outcome) => outcome === 'Goal' ? 'white' : '#aaa'

  return (
    <div>
      <p style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        {title} <span style={{ fontWeight: 400, opacity: 0.6 }}>({shots.length} shots · xG {shots.reduce((a, s) => a + s.xg, 0).toFixed(2)})</span>
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 11, fontFamily: 'var(--font)' }}>
        <span><span style={{ color: '#09D69F', fontWeight: 700 }}>●</span> Goal</span>
        <span><span style={{ color: '#FFD166', fontWeight: 700 }}>●</span> On Target</span>
        <span><span style={{ color: 'white', fontWeight: 700 }}>○</span> Off Target / Blocked</span>
      </div>
      {/* Show only attacking half */}
      <svg viewBox="60 0 60 80" style={{ width: '50%', display: 'block', background: 'white', border: '1px solid #ccc', borderRadius: 4 }}>
        {/* Goal */}
        <rect x={120} y={36} width={2} height={8} fill="none" stroke="black" strokeWidth={0.5} />
        <rect x={103.5} y={20} width={16.5} height={40} fill="none" stroke="black" strokeWidth={0.4} />
        <rect x={114.5} y={30} width={5.5} height={20} fill="none" stroke="black" strokeWidth={0.3} />
        <line x1={60} y1={0} x2={60} y2={80} stroke="black" strokeWidth={0.4} />
        <rect x={60} y={0} width={60} height={80} fill="none" stroke="black" strokeWidth={0.5} />

        {shots.map((s, i) => {
          const r = 1.5 + (s.xg / maxXG) * 3
          return (
            <g key={i}>
              <circle
                cx={s.start_x} cy={s.start_y} r={r}
                fill={color(s.outcome)} stroke={stroke(s.outcome)} strokeWidth={0.3}
                opacity={0.85}
              />
              {s.outcome === 'Goal' && (
                <text x={s.start_x} y={s.start_y + 0.5} textAnchor="middle"
                  fontSize={1.5} fill="white" fontWeight="bold">G</text>
              )}
            </g>
          )
        })}
      </svg>
      <p style={{ fontSize: 10, fontFamily: 'var(--font)', opacity: 0.6, marginTop: 4 }}>
        Circle size ∝ xG value
      </p>
    </div>
  )
}
