/**
 * ProgressionTab — track each player's improvement or decline across matches.
 *
 * Layout:
 *  Left  — player list ranked by overall trend score (↑↓→)
 *  Right — selected player detail: sparklines + per-match values for every metric
 */
import { useState, useMemo } from 'react'
import { TEAM_IDS } from '../hooks/useMatchData.js'

const FONT = 'var(--font)'

// ─── Metric definitions ──────────────────────────────────────────────────────
const METRICS = [
  // Passing
  { key: 'totalPasses',    label: 'Total Passes',    group: 'Passing',   color: '#006032', higherIsBetter: true },
  { key: 'passAccuracy',   label: 'Pass Accuracy',   group: 'Passing',   color: '#006032', higherIsBetter: true, suffix: '%' },
  { key: 'completePasses', label: 'Pass Completed',  group: 'Passing',   color: '#006032', higherIsBetter: true },
  { key: 'progPasses',     label: 'Prog. Passes',    group: 'Passing',   color: '#006032', higherIsBetter: true },
  { key: 'keyPasses',      label: 'Key Passes',      group: 'Passing',   color: '#006032', higherIsBetter: true },
  // Attacking
  { key: 'goals',          label: 'Goals',           group: 'Attacking', color: '#fdc300', higherIsBetter: true },
  { key: 'totalShots',     label: 'Shots',           group: 'Attacking', color: '#fdc300', higherIsBetter: true },
  { key: 'shotsOnTarget',  label: 'Shots on Target', group: 'Attacking', color: '#fdc300', higherIsBetter: true },
  { key: 'totalXG',        label: 'xG',              group: 'Attacking', color: '#fdc300', higherIsBetter: true, decimals: 2 },
  { key: 'succDribbles',   label: 'Dribbles Won',    group: 'Attacking', color: '#fdc300', higherIsBetter: true },
  { key: 'carriesIntoFT',  label: 'Carries F3rd',    group: 'Attacking', color: '#fdc300', higherIsBetter: true },
  // Defensive
  { key: 'tackles',        label: 'Tackles',         group: 'Defensive', color: '#000000', higherIsBetter: true },
  { key: 'succTackles',    label: 'Tackles Won',     group: 'Defensive', color: '#000000', higherIsBetter: true },
  { key: 'interceptions',  label: 'Interceptions',   group: 'Defensive', color: '#000000', higherIsBetter: true },
  { key: 'duelsWon',       label: 'Duels Won',       group: 'Defensive', color: '#000000', higherIsBetter: true },
  { key: 'pressures',      label: 'Pressures',       group: 'Defensive', color: '#000000', higherIsBetter: true },
  { key: 'clearances',     label: 'Clearances',      group: 'Defensive', color: '#000000', higherIsBetter: true },
  { key: 'foulsCommitted', label: 'Fouls',           group: 'Defensive', color: '#000000', higherIsBetter: false },
]

const GROUPS = ['Passing', 'Attacking', 'Defensive']

const GROUP_HEADER_COLOR = {
  Passing:   '#006032',
  Attacking: '#fdc300',
  Defensive: '#000000',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getVal(stats, key) {
  if (!stats) return null
  const v = stats[key]
  return v != null ? v : null
}

/**
 * Trend direction: compare first non-null to last non-null value.
 * Returns 'up' | 'down' | 'flat' | 'nodata'
 */
function trendDir(vals, higherIsBetter) {
  const nonNull = vals.filter(v => v != null)
  if (nonNull.length < 2) return 'nodata'
  const delta = nonNull[nonNull.length - 1] - nonNull[0]
  if (Math.abs(delta) < 0.005) return 'flat'
  const isGood = higherIsBetter ? delta > 0 : delta < 0
  return isGood ? 'up' : 'down'
}

function firstName(name = '') {
  return name.trim().split(' ')[0].toUpperCase()
}

function getOpponent(match) {
  if (!match) return 'Unknown'
  return TEAM_IDS.includes(match.home_team_id)
    ? (match.away_team?.team_name ?? 'Unknown')
    : (match.home_team?.team_name ?? 'Unknown')
}

// Shorten "GKS Jodła Jedlnia-Letnisko" → "Jedlnia-Letnisko"
function shortOpp(match) {
  const full = getOpponent(match)
  const words = full.split(' ')
  return words.length > 2 ? words.slice(-2).join(' ') : full
}

// ─── Trend arrow ─────────────────────────────────────────────────────────────
// `dark` = rendered on the black sidebar/header chrome, where plain black
// would be invisible — swap to gold (up) / white (down) there instead.
function TrendArrow({ dir, size = 14, dark = false }) {
  const s = { fontSize: size, fontWeight: 900, lineHeight: 1 }
  if (dir === 'up')     return <span style={{ ...s, color: dark ? '#fdc300' : '#006032' }}>↑</span>
  if (dir === 'down')   return <span style={{ ...s, color: dark ? '#ffffff' : '#000000' }}>↓</span>
  if (dir === 'flat')   return <span style={{ ...s, color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>→</span>
  return <span style={{ ...s, color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}>—</span>
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ values, upColor = '#006032', downColor = '#000000', neutralColor = 'rgba(0,0,0,0.3)', dir, w = 90, h = 38 }) {
  const color = dir === 'up' ? upColor : dir === 'down' ? downColor : neutralColor
  const nonNull = values.filter(v => v != null)

  if (nonNull.length === 0) {
    return (
      <svg width={w} height={h}>
        <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize={8} fill="rgba(0,0,0,0.3)" fontFamily={FONT}>
          No data
        </text>
      </svg>
    )
  }

  const pad = 8
  const min = Math.min(...nonNull)
  const max = Math.max(...nonNull)
  const range = max === min ? 1 : max - min

  const pts = values.map((v, i) => {
    const x = values.length === 1
      ? w / 2
      : pad + (i / (values.length - 1)) * (w - 2 * pad)
    const y = v != null
      ? (h - pad - 2) - ((v - min) / range) * (h - 2 * pad - 4)
      : null
    return { x, y, v }
  })

  // Build polyline path (break at nulls)
  const segments = []
  let seg = []
  for (const pt of pts) {
    if (pt.y == null) { if (seg.length) { segments.push(seg); seg = [] } }
    else seg.push(pt)
  }
  if (seg.length) segments.push(seg)

  // Area fill under first continuous segment
  let areaD = ''
  if (segments[0]?.length > 1) {
    const s0 = segments[0]
    areaD = `M${s0[0].x},${h - pad + 2} ` + s0.map(p => `L${p.x},${p.y}`).join(' ') + ` L${s0[s0.length - 1].x},${h - pad + 2}Z`
  }

  return (
    <svg width={w} height={h} overflow="visible">
      {/* Baseline */}
      <line x1={pad} y1={h - pad + 2} x2={w - pad} y2={h - pad + 2} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Match tick marks */}
      {values.map((_, i) => {
        const x = values.length === 1 ? w / 2 : pad + (i / (values.length - 1)) * (w - 2 * pad)
        return <line key={i} x1={x} y1={h - pad + 2} x2={x} y2={h - pad + 5} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
      })}
      {/* Shaded area */}
      {areaD && <path d={areaD} fill={color} fillOpacity={0.12} />}
      {/* Lines */}
      {segments.map((s, si) =>
        s.length > 1 && (
          <polyline
            key={si}
            points={s.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke={color} strokeWidth={2.5}
            strokeLinejoin="round" strokeLinecap="round"
          />
        )
      )}
      {/* Dots */}
      {pts.map((pt, i) =>
        pt.y != null && (
          <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5} />
        )
      )}
      {/* DNP markers */}
      {pts.map((pt, i) =>
        pt.y == null && (
          <text key={i} x={pt.x} y={h / 2} textAnchor="middle" fontSize={9} fill="rgba(0,0,0,0.3)">∅</text>
        )
      )}
    </svg>
  )
}

// ─── Mini sparkline for sidebar ───────────────────────────────────────────────
// Always rendered on the black sidebar, so use gold/white instead of
// green/black (which would have no contrast against the dark background).
function MiniSparkline({ values, dir }) {
  const color = dir === 'up' ? '#fdc300' : dir === 'down' ? '#ffffff' : 'rgba(255,255,255,0.5)'
  const nonNull = values.filter(v => v != null)
  if (nonNull.length < 2) return null
  const min = Math.min(...nonNull)
  const max = Math.max(...nonNull)
  const range = max === min ? 1 : max - min
  const w = 40, h = 18, pad = 3
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (w - 2 * pad),
    y: v != null ? (h - pad) - ((v - min) / range) * (h - 2 * pad) : null,
  }))
  const validPts = pts.filter(p => p.y != null)
  if (validPts.length < 2) return null
  return (
    <svg width={w} height={h}>
      <polyline
        points={validPts.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProgressionTab({ matches, allLineups, statsByMatch }) {
  const [selectedPid, setSelectedPid] = useState(null)
  const [groupFilter, setGroupFilter] = useState('All')

  // Sort matches chronologically
  const sortedMatches = useMemo(() =>
    [...matches].sort((a, b) => {
      const da = a.match_date ? new Date(a.match_date) : 0
      const db = b.match_date ? new Date(b.match_date) : 0
      return da - db
    }),
  [matches])

  // Build per-player progression data
  const playerProgression = useMemo(() => {
    return allLineups.map(lineup => {
      const pid = lineup.player_id
      const matchStats = sortedMatches.map(m => statsByMatch[m.match_id]?.[pid] ?? null)
      const playedCount = matchStats.filter(Boolean).length
      if (playedCount === 0) return null

      const metricTrends = METRICS.map(metric => {
        const vals = matchStats.map(s => getVal(s, metric.key))
        const dir  = trendDir(vals, metric.higherIsBetter)
        const nonNull = vals.filter(v => v != null)
        const delta = nonNull.length >= 2 ? nonNull[nonNull.length - 1] - nonNull[0] : null
        return { ...metric, vals, dir, delta }
      })

      const ups      = metricTrends.filter(m => m.dir === 'up').length
      const downs    = metricTrends.filter(m => m.dir === 'down').length
      const score    = ups - downs
      const overallDir = score > 1 ? 'up' : score < -1 ? 'down' : 'flat'

      // Best metric (biggest positive delta normalised by range)
      const bestMetric = metricTrends
        .filter(m => m.dir === 'up' && m.delta != null)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null
      const worstMetric = metricTrends
        .filter(m => m.dir === 'down' && m.delta != null)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null

      return { pid, lineup, matchStats, playedCount, metricTrends, ups, downs, score, overallDir, bestMetric, worstMetric }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
  }, [allLineups, sortedMatches, statsByMatch])

  const effectivePid = selectedPid ?? playerProgression[0]?.pid
  const selected = playerProgression.find(p => p.pid === effectivePid) ?? null

  const visibleGroups = groupFilter === 'All' ? GROUPS : [groupFilter]

  const formatVal = (v, metric) => {
    if (v == null) return '—'
    if (metric.suffix)   return v + metric.suffix
    if (metric.decimals) return Number(v).toFixed(metric.decimals)
    return String(v)
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>

      {/* ── Player list ─────────────────────────────────────── */}
      <div style={{ width: 210, minWidth: 210, background: '#000', borderRight: '3px solid #000', overflowY: 'auto', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        <div style={{ padding: '10px 12px 8px', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: '#fdc300', fontWeight: 700, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 2 }}>
            Progression Rank
          </div>
          <div style={{ fontSize: 7, letterSpacing: 1, color: 'rgba(255,255,255,0.45)', fontFamily: FONT, textTransform: 'uppercase' }}>
            Score = improving metrics − declining
          </div>
        </div>

        {playerProgression.map((p, rank) => {
          const isSel = p.pid === effectivePid
          // Dark sidebar row — gold/white instead of green/black for contrast.
          const scoreColor = p.score > 0 ? '#fdc300' : p.score < 0 ? '#ffffff' : 'rgba(255,255,255,0.45)'
          // Use passAccuracy as the mini sparkline metric (visible in sidebar)
          const passTrend = p.metricTrends.find(m => m.key === 'passAccuracy')

          return (
            <div
              key={p.pid}
              onClick={() => setSelectedPid(p.pid)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', cursor: 'pointer',
                background: isSel ? '#fdc300' : rank % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.04)',
                borderLeft: isSel ? '4px solid #000' : '4px solid transparent',
                color: isSel ? '#000' : 'rgba(255,255,255,0.8)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Rank */}
              <span style={{ fontSize: 8, minWidth: 14, opacity: 0.4, fontFamily: FONT, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
                {rank + 1}
              </span>
              {/* Jersey */}
              <span style={{ fontSize: 9, minWidth: 18, opacity: 0.5, fontFamily: FONT, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
                {p.lineup.jersey_no ?? '—'}
              </span>
              {/* Name */}
              <span style={{ flex: 1, fontSize: 10, fontWeight: 700, fontFamily: FONT, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
                {firstName(p.lineup.player?.player_name ?? 'Unknown')}
              </span>
              {/* Mini sparkline */}
              {passTrend && <MiniSparkline values={passTrend.vals} dir={passTrend.dir} />}
              {/* Score badge */}
              <span style={{
                fontSize: 9, fontWeight: 900, fontFamily: FONT, minWidth: 24, textAlign: 'center',
                color: isSel ? '#000' : scoreColor,
              }}>
                {p.score > 0 ? '+' : ''}{p.score}
              </span>
              <TrendArrow dir={p.overallDir} size={12} dark />
            </div>
          )
        })}
      </div>

      {/* ── Detail panel ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        {selected ? (
          <>
            {/* ── Player header ── */}
            <div style={{ background: '#000', borderBottom: '3px solid #fdc300', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
              {/* Jersey + name */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <span style={{ fontSize: 44, fontWeight: 900, fontFamily: FONT, color: '#fdc300', lineHeight: 1 }}>
                  {selected.lineup.jersey_no ?? '—'}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 }}>
                    {selected.lineup.player?.player_name ?? 'Unknown'}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: FONT, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>
                    {selected.playedCount} of {sortedMatches.length} matches played
                    {selected.bestMetric && (
                      <span style={{ color: '#006032', marginLeft: 8 }}>
                        ↑ Best: {selected.bestMetric.label}
                      </span>
                    )}
                    {selected.worstMetric && (
                      <span style={{ color: '#000000', marginLeft: 8 }}>
                        ↓ Worst: {selected.worstMetric.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats summary pills */}
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', padding: '8px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT, color: '#fdc300' }}>{selected.ups}</div>
                  <div style={{ fontSize: 7, fontFamily: FONT, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Improving</div>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.2)', padding: '8px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT, color: '#ffffff' }}>{selected.downs}</div>
                  <div style={{ fontSize: 7, fontFamily: FONT, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Declining</div>
                </div>
                <div style={{
                  textAlign: 'center',
                  background: selected.score > 0 ? '#fdc300' : selected.score < 0 ? '#ffffff' : 'rgba(255,255,255,0.12)',
                  padding: '10px 18px',
                }}>
                  <div style={{ fontSize: 26, fontWeight: 900, fontFamily: FONT, color: selected.score === 0 ? '#fff' : '#000', lineHeight: 1 }}>
                    {selected.score > 0 ? '+' : ''}{selected.score}
                  </div>
                  <div style={{ fontSize: 7, fontFamily: FONT, color: selected.score === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Trend Score
                  </div>
                </div>
                <div style={{ fontSize: 42, lineHeight: 1 }}>
                  <TrendArrow dir={selected.overallDir} size={42} dark />
                </div>
              </div>
            </div>

            {/* ── Column header (matches) ── */}
            <div style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #000', flexShrink: 0 }}>
              <div style={{ width: 152, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.15)', padding: '8px 14px' }}>
                {/* Group filter buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['All', ...GROUPS].map(g => (
                    <button
                      key={g}
                      onClick={() => setGroupFilter(g)}
                      style={{
                        fontFamily: FONT, fontWeight: 700, fontSize: 7.5, letterSpacing: 1,
                        textTransform: 'uppercase', padding: '3px 7px', cursor: 'pointer',
                        border: '1.5px solid',
                        borderColor: groupFilter === g ? '#000' : 'rgba(0,0,0,0.15)',
                        background: groupFilter === g ? '#000' : 'transparent',
                        color: groupFilter === g ? '#fdc300' : 'rgba(0,0,0,0.45)',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ width: 106, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}>
                <span style={{ fontSize: 8, fontWeight: 700, fontFamily: FONT, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Trend</span>
              </div>
              {sortedMatches.map((m, i) => {
                const played = selected.matchStats[i] != null
                const opp = shortOpp(m)
                const date = m.match_date ? String(m.match_date).slice(5, 10).replace('-', '/') : ''
                return (
                  <div
                    key={m.match_id}
                    style={{
                      flex: 1, padding: '6px 4px', textAlign: 'center',
                      borderRight: '1px solid rgba(0,0,0,0.15)',
                      background: '#fff',
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 900, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 1, color: played ? '#000' : 'rgba(0,0,0,0.25)' }}>
                      M{i + 1}
                    </div>
                    <div style={{ fontSize: 7.5, fontFamily: FONT, color: played ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.25)', letterSpacing: 0.5, lineHeight: 1.3 }}>
                      vs {opp}
                    </div>
                    <div style={{ fontSize: 7, fontFamily: FONT, color: 'rgba(0,0,0,0.4)' }}>{date}</div>
                    {!played && (
                      <div style={{ fontSize: 7, fontWeight: 700, fontFamily: FONT, color: 'rgba(0,0,0,0.25)', letterSpacing: 1, textTransform: 'uppercase' }}>DNP</div>
                    )}
                  </div>
                )
              })}
              <div style={{ width: 56, flexShrink: 0, padding: '6px 4px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, fontWeight: 700, fontFamily: FONT, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Δ</span>
              </div>
            </div>

            {/* ── Metric rows ── */}
            <div style={{ flex: 1 }}>
              {visibleGroups.map(group => {
                const groupMetrics = selected.metricTrends.filter(m => m.group === group)
                if (groupMetrics.length === 0) return null
                const hdrColor = GROUP_HEADER_COLOR[group]

                return (
                  <div key={group}>
                    {/* Group header */}
                    <div style={{
                      background: hdrColor, color: '#fff',
                      padding: '5px 14px', fontSize: 9, fontWeight: 700,
                      letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: FONT,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {group}
                      <span style={{ fontSize: 7, fontWeight: 400, opacity: 0.7, letterSpacing: 1 }}>
                        {groupMetrics.filter(m => m.dir === 'up').length} ↑ &nbsp;
                        {groupMetrics.filter(m => m.dir === 'down').length} ↓
                      </span>
                    </div>

                    {groupMetrics.map((metric, ri) => {
                      const isUp    = metric.dir === 'up'
                      const isDown  = metric.dir === 'down'
                      const isNodata = metric.dir === 'nodata'
                      const deltaStr = metric.delta == null ? '—'
                        : (metric.delta > 0 ? '+' : '') +
                          (metric.decimals ? metric.delta.toFixed(metric.decimals) : Math.round(metric.delta)) +
                          (metric.suffix ?? '')
                      const deltaColor = isUp ? '#006032' : isDown ? '#000000' : 'rgba(0,0,0,0.35)'
                      const rowBg = '#fff'

                      return (
                        <div
                          key={metric.key}
                          style={{
                            display: 'flex', alignItems: 'center',
                            borderBottom: '1px solid rgba(0,0,0,0.08)',
                            background: rowBg, minHeight: 56,
                          }}
                        >
                          {/* Metric label */}
                          <div style={{
                            width: 152, flexShrink: 0, padding: '8px 14px',
                            borderRight: '1px solid rgba(0,0,0,0.15)',
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: 0.5, color: '#000' }}>
                              {metric.label}
                            </div>
                            {!metric.higherIsBetter && (
                              <div style={{ fontSize: 7, color: 'rgba(0,0,0,0.4)', fontFamily: FONT, marginTop: 1 }}>lower = better</div>
                            )}
                          </div>

                          {/* Sparkline */}
                          <div style={{
                            width: 106, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '4px 8px', borderRight: '1px solid rgba(0,0,0,0.15)',
                          }}>
                            <Sparkline values={metric.vals} dir={metric.dir} w={90} h={38} />
                          </div>

                          {/* Per-match values */}
                          {sortedMatches.map((m, mi) => {
                            const v   = metric.vals[mi]
                            const fmt = formatVal(v, metric)
                            const isLastMatch  = mi === sortedMatches.length - 1
                            const isFirstMatch = mi === 0

                            // Highlight last match cell based on trend — green wash for
                            // improving, black wash for declining (no red in the palette).
                            const cellBg = v == null ? '#fff'
                              : isLastMatch && isUp   ? 'rgba(0,96,50,0.08)'
                              : isLastMatch && isDown ? 'rgba(0,0,0,0.06)'
                              : 'inherit'

                            return (
                              <div
                                key={m.match_id}
                                style={{
                                  flex: 1, textAlign: 'center',
                                  padding: '8px 4px', borderRight: '1px solid rgba(0,0,0,0.15)',
                                  background: cellBg,
                                }}
                              >
                                <span style={{
                                  fontSize: 16, fontWeight: 700, fontFamily: FONT,
                                  color: v == null ? 'rgba(0,0,0,0.25)' : '#000',
                                }}>
                                  {fmt}
                                </span>
                                {/* show small arrow between matches */}
                                {mi > 0 && metric.vals[mi - 1] != null && v != null && (
                                  <div style={{ fontSize: 8, marginTop: 1 }}>
                                    {v > metric.vals[mi - 1]
                                      ? <span style={{ color: metric.higherIsBetter ? '#006032' : '#000000' }}>▲</span>
                                      : v < metric.vals[mi - 1]
                                      ? <span style={{ color: metric.higherIsBetter ? '#000000' : '#006032' }}>▼</span>
                                      : <span style={{ color: 'rgba(0,0,0,0.3)' }}>▬</span>
                                    }
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Δ total */}
                          <div style={{ width: 56, flexShrink: 0, textAlign: 'center', padding: '8px 4px' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT, color: isNodata ? 'rgba(0,0,0,0.3)' : deltaColor }}>
                              {deltaStr}
                            </div>
                            <TrendArrow dir={metric.dir} size={11} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, opacity: 0.35 }}>
            <div style={{ fontSize: 56 }}>📈</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' }}>
              No progression data yet
            </div>
            <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
              Need at least 2 matches per player
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
