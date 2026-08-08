import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

export default function PlayerRadar({ data, teamColor, playerName }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        Performance Radar
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(0,0,0,0.15)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fontFamily: 'Courier New, monospace', fontWeight: 700 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={playerName}
            dataKey="value"
            stroke={teamColor}
            fill={teamColor}
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ fontFamily: 'Courier New, monospace', fontSize: 12, border: `2px solid ${teamColor}` }}
            formatter={(v) => [`${v}/100`]}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 10, fontFamily: 'var(--font)', opacity: 0.6, textAlign: 'center' }}>
        Values normalised 0–100 relative to all players in this match
      </p>
    </div>
  )
}
