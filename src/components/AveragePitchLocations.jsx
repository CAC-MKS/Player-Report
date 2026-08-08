/**
 * AveragePitchLocations — 2x2 grid of pitch canvases showing average positions.
 * Players can be toggled on/off; passing/receiving positions recalculate to
 * reflect only interactions between visible players.
 */
import { useRef, useLayoutEffect, useState, useMemo } from 'react'
import { drawPitch } from '../utils/pitchRenderer.js'

const ASPECT      = 105 / 68
const COLOR       = '#0077B6'
const PASS_ACTIONS = ['Pass', 'Through Ball']
const DEF_ACTIONS  = ['Standing Tackle', 'Sliding Tackle', 'Pass Intercept', 'Pressure', 'Block', 'Clearance']

function mapCoords(x, y, w, h) {
  return { px: (x / 120) * w, py: (1 - y / 80) * h }
}

function lastName(fullName = '') {
  const parts = fullName.trim().split(' ')
  return parts[0].toUpperCase()
}

// Infer receiver: earliest visible teammate event within 10 units + 8 sec
function inferReceiverId(pass, allTeamEvents, visibleIds) {
  if (pass.end_x == null || pass.end_y == null) return null
  const T = pass.match_time_seconds ?? 0
  for (const ev of allTeamEvents) {
    if (!visibleIds.has(ev.player_id) || ev.player_id === pass.player_id) continue
    const t = ev.match_time_seconds ?? 0
    if (t < T || t > T + 8) continue
    if (Math.abs((ev.start_x ?? 0) - pass.end_x) < 10 && Math.abs((ev.start_y ?? 0) - pass.end_y) < 10)
      return ev.player_id
  }
  return null
}

/**
 * Build per-player average positions for a given view mode.
 * For passing/receiving views, positions are recalculated based on
 * passes between visible players only so removing a player shifts others.
 */
function buildPositions(allStats, lineups, visibleIds, mode, allTeamEvents) {
  const result = []

  for (const [pid, stats] of Object.entries(allStats ?? {})) {
    if (!visibleIds.has(pid)) continue

    let xs = [], ys = []

    if (mode === 'passing') {
      // Average start position of passes to visible teammates
      const passes = (stats.passEvents ?? []).filter(p => p.start_x != null)
      const networkPasses = passes.filter(p => {
        const rid = p.receiver_player_id ?? p.secondary_player_id ?? inferReceiverId(p, allTeamEvents, visibleIds)
        return rid && rid !== pid && visibleIds.has(rid)
      })
      const src = networkPasses.length >= 2 ? networkPasses : passes
      xs = src.map(p => p.start_x)
      ys = src.map(p => p.start_y)

    } else if (mode === 'receiving') {
      // Average END position of passes from visible teammates to this player
      // Look through all visible players' passes and find ones that end near this player
      for (const [opid, ostats] of Object.entries(allStats ?? {})) {
        if (!visibleIds.has(opid) || opid === pid) continue
        const passes = (ostats.passEvents ?? []).filter(p => p.end_x != null && p.end_y != null)
        for (const p of passes) {
          const rid = p.receiver_player_id ?? p.secondary_player_id ?? inferReceiverId(p, allTeamEvents, visibleIds)
          if (rid === pid) { xs.push(p.end_x); ys.push(p.end_y) }
        }
      }
      // Fallback: use own pass end coords if no received passes found
      if (xs.length < 2) {
        const own = (stats.passEvents ?? []).filter(p => p.end_x != null)
        xs = own.map(p => p.end_x)
        ys = own.map(p => p.end_y)
      }

    } else if (mode === 'defensive') {
      const evs = (stats.allEvents ?? []).filter(e => DEF_ACTIONS.includes(e.action) && e.start_x != null)
      xs = evs.map(e => e.start_x)
      ys = evs.map(e => e.start_y)

    } else if (mode === 'shooting') {
      const evs = (stats.allEvents ?? []).filter(e => e.action === 'Shoot' && e.start_x != null)
      xs = evs.map(e => e.start_x)
      ys = evs.map(e => e.start_y)
    }

    if (xs.length < 2) continue

    const avgX = xs.reduce((s, v) => s + v, 0) / xs.length
    const avgY = ys.reduce((s, v) => s + v, 0) / ys.length
    const lineup = lineups.find(l => l.player_id === pid)
    result.push({
      pid, avgX, avgY,
      name: lineup?.player?.player_name ?? 'Unknown',
      jersey: lineup?.jersey_no ?? '?',
      count: xs.length,
    })
  }
  return result
}

function PitchCanvas({ players, title }) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    function draw(w) {
      if (w <= 0) return
      const h   = w / ASPECT
      const dpr = window.devicePixelRatio || 1
      canvas.width        = w * dpr
      canvas.height       = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      drawPitch(ctx, w, h)

      const fontSize = Math.max(6, Math.min(9, w / 60))

      for (const p of players) {
        const { px, py } = mapCoords(p.avgX, p.avgY, w, h)
        const r = Math.max(6, Math.min(12, w / 55))

        ctx.save()
        ctx.fillStyle   = COLOR
        ctx.strokeStyle = '#fff'
        ctx.lineWidth   = 1.5
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.fillStyle    = '#fff'
        ctx.font         = `bold ${Math.max(5, r * 0.9)}px var(--font)`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(p.jersey), px, py)
        ctx.restore()

        ctx.save()
        ctx.fillStyle    = '#111'
        ctx.font         = `bold ${fontSize}px var(--font)`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(lastName(p.name), px, py + r + 2)
        ctx.restore()
      }
    }

    const initW = container.offsetWidth || container.getBoundingClientRect().width
    draw(initW)
    const observer = new ResizeObserver(([entry]) => draw(entry.contentRect.width))
    observer.observe(container)
    return () => observer.disconnect()
  }, [players])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #000' }}>
      <div style={{ background: '#000', color: '#FFD166', padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font)' }}>
        {title}
      </div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  )
}

export default function AveragePitchLocations({ allStats, lineups }) {
  const startingIds = lineups.filter(l => l.starting_xi).map(l => l.player_id).filter(Boolean)
  const [selectedIds, setSelectedIds] = useState(() => new Set(startingIds))

  const toggle = (pid) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(pid) ? next.delete(pid) : next.add(pid)
    return next
  })
  const reset = () => setSelectedIds(new Set(startingIds))

  // All team events sorted by time — for receiver inference
  const allTeamEvents = useMemo(() => {
    return Object.entries(allStats ?? {})
      .flatMap(([pid, s]) => (s.allEvents ?? []).map(e => ({ ...e, player_id: e.player_id ?? pid })))
      .sort((a, b) => (a.match_time_seconds ?? 0) - (b.match_time_seconds ?? 0))
  }, [allStats])

  const passing    = useMemo(() => buildPositions(allStats, lineups, selectedIds, 'passing',   allTeamEvents), [allStats, lineups, selectedIds, allTeamEvents])
  const receiving  = useMemo(() => buildPositions(allStats, lineups, selectedIds, 'receiving', allTeamEvents), [allStats, lineups, selectedIds, allTeamEvents])
  const defensive  = useMemo(() => buildPositions(allStats, lineups, selectedIds, 'defensive', allTeamEvents), [allStats, lineups, selectedIds, allTeamEvents])
  const shooting   = useMemo(() => buildPositions(allStats, lineups, selectedIds, 'shooting',  allTeamEvents), [allStats, lineups, selectedIds, allTeamEvents])

  const starters = lineups.filter(l => l.starting_xi)
  const subs     = lineups.filter(l => !l.starting_xi)

  const btnBase = { padding: '3px 8px', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font)', cursor: 'pointer', border: '2px solid #444', background: 'transparent', color: '#ccc', marginBottom: 4, textAlign: 'left', width: '100%' }
  const btnOn   = { ...btnBase, border: '2px solid #FFD166', background: '#FFD166', color: '#000' }

  return (
    <div style={{ display: 'flex', gap: 0 }}>

      {/* ── Player toggle panel ── */}
      <div style={{ width: 160, minWidth: 160, background: '#111', borderRight: '3px solid #000', display: 'flex', flexDirection: 'column', padding: '10px 8px', gap: 2, overflowY: 'auto' }}>
        <button onClick={reset} style={{ fontFamily: 'var(--font)', fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: '#333', color: '#FFD166', border: '2px solid #FFD166', padding: '4px 0', cursor: 'pointer', marginBottom: 8 }}>
          Reset to XI
        </button>

        {starters.length > 0 && (
          <div style={{ fontSize: 7, letterSpacing: 2, color: '#888', fontWeight: 700, fontFamily: 'var(--font)', textTransform: 'uppercase', marginBottom: 4 }}>Starting XI</div>
        )}
        {starters.map(p => (
          <button key={p.player_id} onClick={() => toggle(p.player_id)} style={selectedIds.has(p.player_id) ? btnOn : btnBase}>
            <span style={{ opacity: 0.6, marginRight: 5 }}>{p.jersey_no}</span>
            {p.player?.player_name ?? ''}
          </button>
        ))}

        {subs.length > 0 && (
          <div style={{ fontSize: 7, letterSpacing: 2, color: '#888', fontWeight: 700, fontFamily: 'var(--font)', textTransform: 'uppercase', margin: '8px 0 4px' }}>Substitutes</div>
        )}
        {subs.map(p => (
          <button key={p.player_id} onClick={() => toggle(p.player_id)} style={selectedIds.has(p.player_id) ? btnOn : btnBase}>
            <span style={{ opacity: 0.6, marginRight: 5 }}>{p.jersey_no}</span>
            {p.player?.player_name ?? ''}
          </button>
        ))}
      </div>

      {/* ── 2×2 pitch grid ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16 }}>
        <PitchCanvas players={passing}   title="Avg Passing Location" />
        <PitchCanvas players={receiving} title="Avg Receiving Position" />
        <PitchCanvas players={defensive} title="Avg Defensive Position" />
        <PitchCanvas players={shooting}  title="Avg Shooting Location" />
      </div>
    </div>
  )
}
