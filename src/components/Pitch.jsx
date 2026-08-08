// SVG pitch — 120×80 coordinate system (matches database)
export default function Pitch({ children, className = '' }) {
  const W = 120, H = 80

  return (
    <svg
      viewBox={`-3 0 ${W + 6} ${H}`}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      overflow="visible"
    >
      {/* Background */}
      <rect x={-3} width={W + 6} height={H} fill="#F4F4F4" />

      {/* Boundary */}
      <rect x={0} y={0} width={W} height={H} fill="none" stroke="black" strokeWidth={0.6} />

      {/* Halfway line */}
      <line x1={60} y1={0} x2={60} y2={H} stroke="black" strokeWidth={0.5} />

      {/* Centre circle */}
      <circle cx={60} cy={40} r={9.15} fill="none" stroke="black" strokeWidth={0.5} />
      <circle cx={60} cy={40} r={0.5} fill="black" />

      {/* Left penalty area */}
      <rect x={0} y={20} width={16.5} height={40} fill="none" stroke="black" strokeWidth={0.5} />
      {/* Left 6-yard box */}
      <rect x={0} y={30} width={5.5} height={20} fill="none" stroke="black" strokeWidth={0.4} />
      {/* Left penalty spot */}
      <circle cx={11} cy={40} r={0.4} fill="black" />

      {/* Right penalty area */}
      <rect x={103.5} y={20} width={16.5} height={40} fill="none" stroke="black" strokeWidth={0.5} />
      {/* Right 6-yard box */}
      <rect x={114.5} y={30} width={5.5} height={20} fill="none" stroke="black" strokeWidth={0.4} />
      {/* Right penalty spot */}
      <circle cx={109} cy={40} r={0.4} fill="black" />

      {/* Goals — protrude outside boundary */}
      <rect x={-2.5} y={36} width={2.5} height={8} fill="#ddd" stroke="black" strokeWidth={0.5} />
      <rect x={120}  y={36} width={2.5} height={8} fill="#ddd" stroke="black" strokeWidth={0.5} />

      {/* Corner arcs */}
      {[[0, 0], [120, 0], [0, 80], [120, 80]].map(([cx, cy], i) => (
        <path key={i}
          d={`M ${cx === 0 ? 1 : 119} ${cy === 0 ? cy : cy} A 1 1 0 0 ${cx === 0 ? 1 : 0} ${cx === 0 ? cx : cx} ${cy === 0 ? 1 : 79}`}
          fill="none" stroke="black" strokeWidth={0.4}
        />
      ))}

      {children}
    </svg>
  )
}
