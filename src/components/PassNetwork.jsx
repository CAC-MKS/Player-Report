/**
 * PassNetwork — Team-wide pass network drawn on a canvas pitch.
 *
 * Edges  = lines between player pairs; thickness = number of passes between them.
 * Nodes  = each player's average position; radius = pass success rate (0–100%).
 * Only edges with ≥ 2 passes are drawn.
 */
import { useRef, useLayoutEffect, useState } from 'react'
import { drawPitch } from '../utils/pitchRenderer.js'

const ASPECT = 105 / 68

function mapXY(x, y, w, h) {
  return { px: (x / 120) * w, py: (1 - y / 80) * h }  // y=0 is bottom in data → flip for screen
}

function lastName(name = '') {
  const parts = name.trim().split(' ')
  return parts[0].toUpperCase()
}

// Map success rate [0,1] to a color between red and green via yellow
function rateColor(rate) {
  // rate 0 → red, 0.5 → yellow, 1 → green
  if (rate >= 0.5) {
    const t = (rate - 0.5) * 2          // 0→1 from yellow to green
    const r = Math.round(255 * (1 - t))
    return `rgb(${r},200,50)`
  } else {
    const t = rate * 2                   // 0→1 from red to yellow
    const g = Math.round(200 * t)
    return `rgb(220,${g},30)`
  }
}

// Infer receiver: earliest teammate event whose start_x/y is within 10 units
// of the pass end_x/y and within 8 seconds after the pass.
function inferReceiverId(pass, allTeamEvents) {
  if (pass.end_x == null || pass.end_y == null) return null
  const T  = pass.match_time_seconds ?? 0
  const ex = pass.end_x
  const ey = pass.end_y
  for (const ev of allTeamEvents) {
    if (ev.player_id === pass.player_id) continue
    const t = ev.match_time_seconds ?? 0
    if (t < T || t > T + 8) continue
    if (Math.abs((ev.start_x ?? 0) - ex) < 10 && Math.abs((ev.start_y ?? 0) - ey) < 10) {
      return ev.player_id
    }
  }
  return null
}

export default function PassNetwork({ allStats, lineups }) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)

  // Build the starting XI set
  const startingIds = lineups.filter(l => l.starting_xi).map(l => l.player_id).filter(Boolean)

  const [selectedIds, setSelectedIds] = useState(() => new Set(startingIds))

  const visiblePlayerIds = selectedIds

  useLayoutEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    function draw(w, h) {
      const dpr = window.devicePixelRatio || 1
      canvas.width        = w * dpr
      canvas.height       = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      drawPitch(ctx, w, h)

      // ── Flatten all team events sorted by time (for receiver inference) ─
      const allTeamEvents = Object.entries(allStats ?? {})
        .flatMap(([pid, s]) => (s.allEvents ?? []).map(e => ({ ...e, player_id: e.player_id ?? pid })))
        .sort((a, b) => (a.match_time_seconds ?? 0) - (b.match_time_seconds ?? 0))

      // ── Build nodes & edges ────────────────────────────────────────────
      const nodes = {}   // pid → { x, y, total, successful, successRate, name, jersey }
      const edges = {}   // "pidA|pidB" → pass count

      const SUCCESS = ['Successful', 'Key Pass', 'Assist']

      // First pass: resolve receiver IDs for all passes so we can filter by visibility
      const passesWithReceiver = {}   // pid → [{ pass, receiverId }]
      for (const [pid, stats] of Object.entries(allStats ?? {})) {
        if (!visiblePlayerIds.has(pid)) continue
        passesWithReceiver[pid] = (stats.passEvents ?? []).map(pass => ({
          pass,
          rid: pass.receiver_player_id ?? pass.secondary_player_id ?? inferReceiverId(pass, allTeamEvents),
        }))
      }

      for (const [pid, pwrs] of Object.entries(passesWithReceiver)) {
        // Only count passes where the receiver is ALSO visible — this makes average
        // position shift when players are added/removed from the network
        const networkPasses = pwrs.filter(({ rid }) => rid && rid !== pid && visiblePlayerIds.has(rid))
        const allPasses     = pwrs.map(({ pass }) => pass)

        // Use network passes for position if we have enough; fall back to all passes
        const positionPasses = networkPasses.length >= 2
          ? networkPasses.map(({ pass }) => pass)
          : allPasses

        const valid = positionPasses.filter(p => p.start_x != null && p.start_y != null)
        if (valid.length === 0) continue

        const avgX = valid.reduce((s, p) => s + p.start_x, 0) / valid.length
        const avgY = valid.reduce((s, p) => s + p.start_y, 0) / valid.length

        const successful  = allPasses.filter(p => SUCCESS.includes(p.outcome)).length
        const successRate = allPasses.length > 0 ? successful / allPasses.length : 0

        const lineup = lineups.find(l => l.player_id === pid)
        const name   = lineup?.player?.player_name ?? lineup?.player_name ?? `#${lineup?.jersey_no ?? '?'}`
        const jersey = lineup?.jersey_no ?? ''

        nodes[pid] = { x: avgX, y: avgY, total: allPasses.length, successful, successRate, name, jersey }

        // Build edges from network passes
        for (const { rid } of networkPasses) {
          const key = [pid, rid].sort().join('|')
          edges[key] = (edges[key] ?? 0) + 1
        }
      }

      const nodeList = Object.entries(nodes)
      if (nodeList.length === 0) return

      const maxEdge = Math.max(...Object.values(edges), 1)

      // ── Draw edges — thickness = pass count ───────────────────────────
      for (const [key, count] of Object.entries(edges)) {
        if (count < 2) continue
        const [idA, idB] = key.split('|')
        const nA = nodes[idA]
        const nB = nodes[idB]
        if (!nA || !nB) continue

        const { px: ax, py: ay } = mapXY(nA.x, nA.y, w, h)
        const { px: bx, py: by } = mapXY(nB.x, nB.y, w, h)

        const alpha = 0.25 + (count / maxEdge) * 0.65
        const lineW = 1   + (count / maxEdge) * 7

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = '#0077B6'
        ctx.lineWidth   = lineW
        ctx.lineCap     = 'round'
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
        ctx.restore()

        // Pass count label at midpoint
        const mx = (ax + bx) / 2
        const my = (ay + by) / 2
        ctx.save()
        ctx.globalAlpha    = 0.9
        ctx.fillStyle      = '#fff'
        ctx.font           = `bold ${Math.max(7, Math.min(10, w / 90))}px monospace`
        ctx.textAlign      = 'center'
        ctx.textBaseline   = 'middle'
        // small background pill
        const label = String(count)
        const tw    = ctx.measureText(label).width + 4
        ctx.fillRect(mx - tw / 2, my - 6, tw, 12)
        ctx.fillStyle = '#0077B6'
        ctx.fillText(label, mx, my)
        ctx.restore()
      }

      // ── Draw nodes — size = success rate ──────────────────────────────
      // Min radius 8px, max radius 20px, scaled by success rate
      const MIN_R = 8
      const MAX_R = 20

      for (const [, node] of nodeList) {
        const { px, py } = mapXY(node.x, node.y, w, h)
        const r = MIN_R + node.successRate * (MAX_R - MIN_R)
        const color = rateColor(node.successRate)

        // Filled circle — color = success rate
        ctx.save()
        ctx.fillStyle   = color
        ctx.strokeStyle = '#000'
        ctx.lineWidth   = 1.5
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        // Jersey number inside
        ctx.save()
        ctx.fillStyle    = '#fff'
        ctx.font         = `bold ${Math.max(7, Math.round(r * 0.85))}px monospace`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(node.jersey), px, py)
        ctx.restore()

        // Last name below
        const labelSize = Math.max(7, Math.min(10, w / 85))
        ctx.save()
        ctx.fillStyle    = '#111'
        ctx.font         = `bold ${labelSize}px monospace`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(lastName(node.name), px, py + r + 2)
        ctx.restore()

        // Success % below name
        ctx.save()
        ctx.fillStyle    = '#444'
        ctx.font         = `${Math.max(6, labelSize - 1)}px monospace`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`${Math.round(node.successRate * 100)}%`, px, py + r + 2 + labelSize + 2)
        ctx.restore()
      }

      // ── Legend ─────────────────────────────────────────────────────────
      const leg = { x: 6, y: h - 36, lineH: 13 }
      const fs  = Math.max(7, Math.min(9, w / 100))

      // Edge thickness legend
      ctx.save()
      ctx.strokeStyle = '#0077B6'
      ctx.lineCap     = 'round'
      ctx.lineWidth   = 1; ctx.globalAlpha = 0.6
      ctx.beginPath(); ctx.moveTo(leg.x, leg.y); ctx.lineTo(leg.x + 18, leg.y); ctx.stroke()
      ctx.lineWidth   = 4; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.moveTo(leg.x, leg.y + leg.lineH); ctx.lineTo(leg.x + 18, leg.y + leg.lineH); ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle   = '#111'
      ctx.font        = `${fs}px monospace`
      ctx.textBaseline = 'middle'
      ctx.fillText('Few passes', leg.x + 22, leg.y)
      ctx.fillText('Many passes', leg.x + 22, leg.y + leg.lineH)
      ctx.restore()

      // Node color legend (right side)
      const rx = w - 70
      const ry = h - 38
      ;[
        { rate: 1,   label: 'High accuracy' },
        { rate: 0.5, label: 'Mid accuracy' },
        { rate: 0,   label: 'Low accuracy' },
      ].forEach(({ rate, label }, i) => {
        ctx.save()
        ctx.fillStyle   = rateColor(rate)
        ctx.strokeStyle = '#000'
        ctx.lineWidth   = 1
        ctx.beginPath()
        ctx.arc(rx, ry + i * 13, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle    = '#111'
        ctx.font         = `${fs}px monospace`
        ctx.textAlign    = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, rx + 9, ry + i * 13)
        ctx.restore()
      })
    }

    const initW = container.offsetWidth || container.getBoundingClientRect().width
    if (initW > 0) draw(initW, initW / ASPECT)

    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) draw(w, w / ASPECT)
    })
    observer.observe(container)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStats, lineups, Array.from(selectedIds).sort().join(',')])

  function togglePlayer(pid) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  function resetToStartingXI() {
    setSelectedIds(new Set(startingIds))
  }

  const btnBase = {
    padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', fontFamily: 'var(--font)', cursor: 'pointer',
    border: '2px solid #000', background: '#fff', color: '#000',
    display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  }
  const btnActive = { ...btnBase, background: '#000', color: '#FFD166', borderColor: '#000' }

  // Build ordered player list: starting XI first, then subs
  const orderedLineups = [
    ...lineups.filter(l => l.starting_xi),
    ...lineups.filter(l => !l.starting_xi),
  ]

  return (
    <div style={{ display: 'flex', width: '100%', gap: 0 }}>
      {/* Canvas — 70% */}
      <div ref={containerRef} style={{ flex: '0 0 70%', width: '70%' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {/* Player toggles — 30% */}
      <div style={{
        flex: '0 0 30%', width: '30%',
        borderLeft: '2px solid #000',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font)',
        overflowY: 'auto',
      }}>
        {/* Reset button */}
        <div style={{ padding: '8px 10px', borderBottom: '2px solid #000' }}>
          <button
            onClick={resetToStartingXI}
            style={{
              ...btnBase,
              background: '#FFD166', color: '#000', borderColor: '#000',
              width: '100%', justifyContent: 'center',
              fontSize: 9, padding: '5px 0',
            }}
          >
            Reset to Starting XI
          </button>
        </div>

        {/* Starting XI label */}
        <div style={{ padding: '4px 10px', background: '#000', color: '#FFD166', fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
          Starting XI
        </div>

        {orderedLineups.map((l, idx) => {
          const pid = l.player_id
          if (!pid) return null
          const isSelected = selectedIds.has(pid)
          const isStarter = l.starting_xi
          const name = l.player?.player_name ?? 'Unknown'
          const lname = lastName(name)
          const jersey = l.jersey_no ?? '?'

          // Separator before subs
          const prevIsStarter = idx > 0 && orderedLineups[idx - 1].starting_xi
          const showSubsLabel = !isStarter && prevIsStarter

          return (
            <div key={pid}>
              {showSubsLabel && (
                <div style={{ padding: '4px 10px', background: '#000', color: '#FFD166', fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                  Substitutes
                </div>
              )}
              <button
                onClick={() => togglePlayer(pid)}
                style={{
                  ...isSelected ? btnActive : btnBase,
                  width: '100%', justifyContent: 'flex-start',
                  padding: '5px 10px',
                  borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                  borderBottom: '1px solid #ddd',
                }}
              >
                <span style={{ minWidth: 18, fontSize: 9, opacity: 0.7, textAlign: 'right', fontWeight: 700 }}>{jersey}</span>
                <span style={{ marginLeft: 6, fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                {!isStarter && <span style={{ marginLeft: 'auto', fontSize: 7, opacity: 0.5, letterSpacing: 1 }}>SUB</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
