/**
 * LineupSuggestion — Interactive 4-4-2 with drag-and-drop (FIFA-style)
 *
 * Algorithm pipeline (unchanged):
 *  1. Extract P90 metrics from all-matches aggregate stats
 *  2. Percentile-rank every metric across the squad
 *  3. Position-specific composite ratings (0–100) via weighted percentile sums
 *  4. Greedy slot assignment: composite rating (65%) + spatial proximity (35%)
 *
 * Interactive features:
 *  - Drag players between pitch slots (swap)
 *  - Drag bench players onto pitch slots (replace + see live composite rating)
 *  - Hover preview: shows what composite rating a bench player would get at that position
 *  - Reset button to restore algorithm suggestion
 */
import { useMemo, useState, useRef, useCallback, useEffect } from 'react'

const FONT   = 'var(--font)'
const ASPECT = 68 / 105

const SLOTS = [
  { id: 'LCB', label: 'LCB', type: 'CB', side: 'L', x: 20, y: 54 },
  { id: 'RCB', label: 'RCB', type: 'CB', side: 'R', x: 20, y: 26 },
  { id: 'LB',  label: 'LB',  type: 'FB', side: 'L', x: 22, y: 70 },
  { id: 'RB',  label: 'RB',  type: 'FB', side: 'R', x: 22, y: 10 },
  { id: 'LCM', label: 'LCM', type: 'CM', side: 'L', x: 50, y: 52 },
  { id: 'RCM', label: 'RCM', type: 'CM', side: 'R', x: 50, y: 28 },
  { id: 'LM',  label: 'LM',  type: 'WM', side: 'L', x: 56, y: 72 },
  { id: 'RM',  label: 'RM',  type: 'WM', side: 'R', x: 56, y:  8 },
  { id: 'LST', label: 'LST', type: 'ST', side: 'L', x: 90, y: 50 },
  { id: 'RST', label: 'RST', type: 'ST', side: 'R', x: 90, y: 30 },
]

const GK_POSITIONS = new Set(['gk', 'goalkeeper'])
const POOR_FIT     = 45
// Position-line colors: defense = black, midfield = gold, attack = green
// (no blues/reds left in the palette — the 5 position types share 3 colors,
// distinguished further by their CB/FB/CM/WM/ST labels).
const posColors    = { CB: '#000000', FB: '#000000', CM: '#fdc300', WM: '#fdc300', ST: '#006032' }

function firstName(name = '') { return name.trim().split(' ')[0].toUpperCase() }

// CSS % position of a slot on the pitch div
function slotStyle(x, y) {
  return {
    left: `${(1 - y / 80) * 100}%`,
    top:  `${(1 - x / 120) * 100}%`,
  }
}

// ─── Metric Extraction (P90) ──────────────────────────────────────────────────
function extractMetrics(pid, allStats) {
  const s = allStats[pid]; if (!s) return null
  const mp  = Math.max(s.matchesPlayed ?? 1, 1)
  const p90 = v => (v ?? 0) / mp
  const totalShots    = s.totalShots ?? 0
  const shotsOnTarget = s.shotsOnTarget ?? 0
  const goals         = s.goals        ?? 0
  const dribbles      = s.dribbles     ?? 0
  const succDribbles  = s.succDribbles ?? 0
  const totalPasses   = s.totalPasses  ?? 0
  const ownHP         = s.ownHalfPasses ?? 0
  const succOwnHP     = s.succOwnHalfPasses ?? 0
  const tackles       = s.tackles      ?? 0
  const succTackles   = s.succTackles  ?? 0
  return {
    totalShots:      p90(totalShots),    shotsOnTarget:   p90(shotsOnTarget),
    goals:           p90(goals),         xG:              p90(s.totalXG   ?? 0),
    xGOT:            p90(s.totalXGOT ?? 0),
    conversionRate:  totalShots    > 0 ? goals        / totalShots    : 0,
    shotAccuracy:    totalShots    > 0 ? shotsOnTarget / totalShots   : 0,
    dribbles:        p90(dribbles),      succDribbles:    p90(succDribbles),
    dribbleSuccRate: dribbles      > 0 ? succDribbles / dribbles      : 0,
    carriesIntoFT:   p90(s.carriesIntoFT  ?? 0),
    carriesIntoBox:  p90(s.carriesIntoBox ?? 0),
    totalPasses:     p90(totalPasses),   passAccuracy:    s.passAccuracy ?? 0,
    progPasses:      p90(s.progPasses        ?? 0),
    succProgPasses:  p90(s.successProgPasses ?? 0),
    longBalls:       p90(s.longBalls         ?? 0),
    crosses:         p90(s.crosses           ?? 0),
    succCrosses:     p90(s.successCrosses    ?? 0),
    passesIntoBox:   p90(s.passesIntoBox     ?? 0),
    keyPasses:       p90(s.keyPasses         ?? 0),
    assists:         p90(s.assists           ?? 0),
    ownHalfPasses:   p90(ownHP),
    oppHalfPasses:   p90(s.oppHalfPasses     ?? 0),
    ownHalfPassAcc:  ownHP > 0 ? (succOwnHP / ownHP) * 100 : 0,
    tackles:         p90(tackles),       succTackles:     p90(succTackles),
    tackleSuccRate:  tackles       > 0 ? succTackles / tackles        : 0,
    interceptions:   p90(s.interceptions ?? 0),
    intRegain:       p90(s.intRegain     ?? 0),
    aerialDuels:     p90(s.aerialDuels   ?? 0),
    pressures:       p90(s.pressures     ?? 0),
    blocks:          p90(s.blocks        ?? 0),
    clearances:      p90(s.clearances    ?? 0),
    mp, passPerMatch: p90(totalPasses) * mp,
  }
}

// ─── Percentile Ranking ───────────────────────────────────────────────────────
function buildPercentileRanker(playerIds, metrics) {
  const skip = new Set(['mp', 'passPerMatch'])
  const dists = {}
  for (const pid of playerIds) {
    const m = metrics[pid]; if (!m) continue
    for (const [k, v] of Object.entries(m)) {
      if (skip.has(k)) continue
      if (!dists[k]) dists[k] = []
      dists[k].push(v)
    }
  }
  return function rank(pid, key) {
    const val  = metrics[pid]?.[key] ?? 0
    const dist = dists[key] ?? []
    if (dist.length <= 1) return 50
    const below = dist.filter(v => v < val).length
    const equal = dist.filter(v => v === val).length
    return ((below + equal * 0.5) / dist.length) * 100
  }
}

// ─── Position Weights & Composite ────────────────────────────────────────────
const POSITION_WEIGHTS = {
  CB: [
    { key: 'aerialDuels',    w: 0.25, label: 'Aerial Duels Won'       },
    { key: 'clearances',     w: 0.20, label: 'Clearances'             },
    { key: 'interceptions',  w: 0.20, label: 'Interceptions'          },
    { key: 'succTackles',    w: 0.15, label: 'Tackles Won'            },
    { key: 'ownHalfPassAcc', w: 0.10, label: 'Own-Half Pass Acc%'     },
    { key: 'blocks',         w: 0.10, label: 'Blocks'                 },
  ],
  FB: [
    { key: 'succTackles',   w: 0.20, label: 'Tackles Won'             },
    { key: 'interceptions', w: 0.15, label: 'Interceptions'           },
    { key: 'progPasses',    w: 0.20, label: 'Progressive Passes'      },
    { key: 'crosses',       w: 0.20, label: 'Crosses'                 },
    { key: 'carriesIntoFT', w: 0.15, label: 'Carries into Final 3rd'  },
    { key: 'succDribbles',  w: 0.10, label: 'Successful Dribbles'     },
  ],
  CM: [
    { key: 'totalPasses',   w: 0.15, label: 'Passes P90'              },
    { key: 'passAccuracy',  w: 0.20, label: 'Pass Accuracy%'          },
    { key: 'progPasses',    w: 0.20, label: 'Progressive Passes'      },
    { key: 'oppHalfPasses', w: 0.15, label: 'Passes in Opp. Half'     },
    { key: 'interceptions', w: 0.15, label: 'Interceptions'           },
    { key: 'pressures',     w: 0.15, label: 'Pressures Applied'       },
  ],
  WM: [
    { key: 'dribbles',       w: 0.20, label: 'Dribbles Attempted'     },
    { key: 'dribbleSuccRate',w: 0.15, label: 'Dribble Success%'       },
    { key: 'crosses',        w: 0.20, label: 'Crosses'                },
    { key: 'keyPasses',      w: 0.20, label: 'Key Passes'             },
    { key: 'carriesIntoFT',  w: 0.15, label: 'Carries into Final 3rd' },
    { key: 'progPasses',     w: 0.10, label: 'Progressive Passes'     },
  ],
  ST: [
    { key: 'goals',          w: 0.25, label: 'Goals P90'              },
    { key: 'xG',             w: 0.20, label: 'xG P90'                 },
    { key: 'shotsOnTarget',  w: 0.20, label: 'Shots on Target P90'    },
    { key: 'conversionRate', w: 0.15, label: 'Conversion Rate'        },
    { key: 'carriesIntoBox', w: 0.10, label: 'Carries into Box'       },
    { key: 'aerialDuels',    w: 0.10, label: 'Aerial Duels Won'       },
  ],
}

function computeComposite(pid, posType, rank, metrics) {
  const weights = POSITION_WEIGHTS[posType] ?? []
  const contribs = weights.map(({ key, w, label }) => {
    const pct = rank(pid, key)
    return { key, label, w, pct, contrib: w * pct, rawVal: metrics[pid]?.[key] ?? 0 }
  })
  const totalW = weights.reduce((s, c) => s + c.w, 0) || 1
  const rating = contribs.reduce((s, c) => s + c.contrib, 0) / totalW
  const top2   = [...contribs].sort((a, b) => b.contrib - a.contrib).slice(0, 2)
  return { rating, top2 }
}

function fmtVal(key, val) {
  if (key === 'passAccuracy' || key === 'ownHalfPassAcc') return `${val.toFixed(0)}%`
  if (['conversionRate','dribbleSuccRate','tackleSuccRate','shotAccuracy'].includes(key))
    return `${(val * 100).toFixed(0)}%`
  if (key === 'xG' || key === 'xGOT') return val.toFixed(2)
  return val.toFixed(1)
}

// ─── Spatial helpers ──────────────────────────────────────────────────────────
function avgLocation(pid, allStats) {
  const evs = (allStats[pid]?.allEvents ?? []).filter(e => e.start_x != null && e.start_y != null)
  if (evs.length < 3) return null
  return { x: evs.reduce((a, e) => a + e.start_x, 0) / evs.length,
           y: evs.reduce((a, e) => a + e.start_y, 0) / evs.length }
}

function spatialDist(loc, slot) {
  if (!loc) return 1.0
  const dx = (loc.x - slot.x) / 120
  const dy = (loc.y - slot.y) / 80
  return Math.sqrt(dx * dx + dy * dy)
}

// ─── Core algorithm ───────────────────────────────────────────────────────────
function computeLineup(lineups, allStats) {
  const outfield = lineups.filter(l => {
    const pos = (l.player?.position ?? '').trim().toLowerCase()
    return !GK_POSITIONS.has(pos) && !!allStats[l.player_id]
  })
  const squad = outfield
  if (squad.length < 10) return null

  const pids = squad.map(p => p.player_id)
  const allPids = outfield.map(p => p.player_id)

  // Metrics for ALL outfield players (needed for bench ratings)
  const metrics = {}
  for (const pid of allPids) metrics[pid] = extractMetrics(pid, allStats)

  const rank    = buildPercentileRanker(pids, metrics)   // rank relative to starter pool
  const allRank = buildPercentileRanker(allPids, metrics) // rank relative to all outfield

  // Composites for ALL outfield players
  const composites = {}
  for (const pid of allPids) {
    composites[pid] = {}
    for (const type of ['CB','FB','CM','WM','ST'])
      composites[pid][type] = computeComposite(pid, type, rank, metrics)
  }

  const locations = {}
  for (const pid of pids) locations[pid] = avgLocation(pid, allStats)

  // Greedy slot assignment from starter pool
  const RATING_W = 0.65, SPATIAL_W = 0.35
  const triples = []
  for (const slot of SLOTS) {
    for (const p of squad) {
      const { rating, top2 } = composites[p.player_id][slot.type]
      const dist    = spatialDist(locations[p.player_id], slot)
      const spatPct = Math.max(0, (1 - dist / 0.8)) * 100
      const score   = rating * RATING_W + spatPct * SPATIAL_W
      triples.push({ score, rating, top2, pid: p.player_id, slotId: slot.id, slotType: slot.type, side: slot.side })
    }
  }
  triples.sort((a, b) => b.score - a.score)

  const usedPlayers = new Set(), usedSlots = new Set()
  const lineup = {}
  for (const t of triples) {
    if (usedPlayers.has(t.pid) || usedSlots.has(t.slotId)) continue
    const player = squad.find(p => p.player_id === t.pid)
    lineup[t.slotId] = { ...t, player }
    usedPlayers.add(t.pid); usedSlots.add(t.slotId)
    if (Object.keys(lineup).length === SLOTS.length) break
  }

  // All outfield players (for bench + drag pool)
  const allPlayers = outfield.map(l => ({
    ...l,
    bestRating: Math.max(...Object.values(composites[l.player_id]).map(c => c.rating)),
  }))

  return { lineup, allPlayers, composites, metrics }
}

// ─── Pitch background (SVG, portrait) ─────────────────────────────────────────
// Portrait pitch: viewBox is 68 wide × 105 tall (real pitch dimensions in m).
// y=0 is the top of the screen (attack end), y=105 is the bottom (defense end).
// SVG auto-scales to its container — no JS measurement or DPI handling needed.
function PitchBackground() {
  const stroke = '#000'
  const sw = 0.35   // line width in pitch units
  return (
    <svg
      viewBox="0 0 68 105"
      preserveAspectRatio="none"
      style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {/* Pitch fill */}
      <rect x="0" y="0" width="68" height="105" fill="#ffffff" />

      {/* Outer boundary */}
      <rect x="0" y="0" width="68" height="105" fill="none" stroke={stroke} strokeWidth={sw} />

      {/* Halfway line */}
      <line x1="0" y1="52.5" x2="68" y2="52.5" stroke={stroke} strokeWidth={sw} />

      {/* Centre circle (r = 9.15m) */}
      <circle cx="34" cy="52.5" r="9.15" fill="none" stroke={stroke} strokeWidth={sw} />
      <circle cx="34" cy="52.5" r="0.4" fill={stroke} />

      {/* Top penalty area (attack end): width 40.32, depth 16.5 */}
      <rect x="13.84" y="0" width="40.32" height="16.5" fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Top 6-yard box: width 18.32, depth 5.5 */}
      <rect x="24.84" y="0" width="18.32" height="5.5" fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Top penalty spot at 11m from goal line */}
      <circle cx="34" cy="11" r="0.4" fill={stroke} />
      {/* Top penalty arc (D) */}
      <path d="M 24.85 16.5 A 9.15 9.15 0 0 0 43.15 16.5" fill="none" stroke={stroke} strokeWidth={sw} />

      {/* Bottom penalty area (defense end) */}
      <rect x="13.84" y="88.5" width="40.32" height="16.5" fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Bottom 6-yard box */}
      <rect x="24.84" y="99.5" width="18.32" height="5.5" fill="none" stroke={stroke} strokeWidth={sw} />
      {/* Bottom penalty spot */}
      <circle cx="34" cy="94" r="0.4" fill={stroke} />
      {/* Bottom penalty arc (D) */}
      <path d="M 24.85 88.5 A 9.15 9.15 0 0 1 43.15 88.5" fill="none" stroke={stroke} strokeWidth={sw} />

      {/* Corner arcs (r = 1m) */}
      <path d="M 0 1 A 1 1 0 0 0 1 0"     fill="none" stroke={stroke} strokeWidth={sw} />
      <path d="M 67 0 A 1 1 0 0 0 68 1"   fill="none" stroke={stroke} strokeWidth={sw} />
      <path d="M 68 104 A 1 1 0 0 0 67 105" fill="none" stroke={stroke} strokeWidth={sw} />
      <path d="M 1 105 A 1 1 0 0 0 0 104" fill="none" stroke={stroke} strokeWidth={sw} />
    </svg>
  )
}

// ─── Player token on pitch ────────────────────────────────────────────────────
function PitchToken({ slot, entry, onDragStart, onDragEnd, isDragging, isDropTarget, previewRating }) {
  const isPoor     = (previewRating ?? entry?.rating ?? 0) < POOR_FIT
  const ratingDisp = previewRating != null ? Math.round(previewRating) : (entry ? Math.round(entry.rating) : '?')
  const hasPreview = previewRating != null && entry && Math.round(previewRating) !== Math.round(entry.rating)

  return (
    <div
      draggable={!!entry}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.() }}
      onDragEnd={onDragEnd}
      style={{
        position: 'absolute',
        left: slotStyle(slot.x, slot.y).left,
        top:  slotStyle(slot.x, slot.y).top,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: entry ? 'grab' : 'default',
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 0.15s',
        zIndex: isDragging ? 0 : 2,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Position pill */}
      <div style={{
        background: isDropTarget ? '#fdc300' : '#000',
        color: isDropTarget ? '#000' : '#fdc300',
        fontSize: 8, fontWeight: 700, letterSpacing: 1,
        padding: '2px 6px', borderRadius: 3, marginBottom: 3,
        fontFamily: FONT, textTransform: 'uppercase',
        border: isDropTarget ? '1.5px solid #000' : 'none',
      }}>
        {slot.label}
      </div>

      {/* Circle */}
      <div style={{
        width: 46, height: 46,
        borderRadius: '50%',
        background: entry ? (isPoor ? '#ffffff' : '#fdc300') : 'rgba(255,255,255,0.25)',
        border: `3px solid ${isDropTarget ? '#006032' : isPoor ? '#000000' : '#000'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isDropTarget ? '0 0 0 3px rgba(0,96,50,0.4)' : '0 2px 8px rgba(0,0,0,0.25)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}>
        <span style={{
          fontFamily: FONT, fontWeight: 700, fontSize: 15,
          color: entry ? '#000' : 'rgba(0,0,0,0.3)',
          lineHeight: 1,
        }}>
          {entry ? (entry.player?.jersey_no ?? '?') : '+'}
        </span>
      </div>

      {/* Rating */}
      {entry && (
        <div style={{
          marginTop: 3,
          fontFamily: FONT, fontWeight: 700,
          fontSize: 11,
          color: isPoor ? '#000000' : '#000',
        }}>
          {hasPreview
            ? <><span style={{ opacity: 0.45, textDecoration: 'line-through', fontSize: 9, marginRight: 3 }}>{Math.round(entry.rating)}</span><span style={{ color: '#006032' }}>{ratingDisp}</span></>
            : ratingDisp}
        </div>
      )}

      {/* Name */}
      {entry && (
        <div style={{
          fontFamily: FONT, fontWeight: 700, fontSize: 8,
          color: '#000', textTransform: 'uppercase', letterSpacing: 0.3,
          maxWidth: 58, textAlign: 'center', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {firstName(entry.player?.player?.player_name ?? entry.player?.player_name ?? '')}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LineupSuggestion({ lineups, allStats }) {
  const baseResult = useMemo(() => computeLineup(lineups, allStats), [lineups, allStats])

  // Editable lineup: slotId → pid (null = use algo result)
  const [overrides, setOverrides] = useState(null)   // null = algorithm result
  const [dragging, setDragging]   = useState(null)   // { pid, fromSlot: slotId|'bench' }
  const [dropTarget, setDropTarget] = useState(null) // slotId being hovered

  const pitchRef = useRef(null)

  if (!baseResult) return (
    <div style={{ padding: 24, fontFamily: FONT, fontSize: 11, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
      Not enough players with ≥ 20 passes/match to suggest a lineup.
    </div>
  )

  const { allPlayers, composites } = baseResult

  // Build active lineup from overrides or base result
  const activeLineup = useMemo(() => {
    if (!overrides) return baseResult.lineup
    const result = {}
    for (const slot of SLOTS) {
      const pid = overrides[slot.id]
      if (!pid) continue
      const player = allPlayers.find(p => p.player_id === pid)
      if (!player) continue
      const { rating, top2 } = composites[pid]?.[slot.type] ?? { rating: 0, top2: [] }
      result[slot.id] = { pid, rating, top2, slotType: slot.type, side: slot.side, slotId: slot.id, player }
    }
    return result
  }, [overrides, baseResult, allPlayers, composites])

  // Bench: all outfield players not in the active lineup
  const benchPlayers = useMemo(() => {
    const starterPids = new Set(Object.values(activeLineup).map(e => e.pid))
    return allPlayers
      .filter(p => !starterPids.has(p.player_id))
      .sort((a, b) => b.bestRating - a.bestRating)
  }, [activeLineup, allPlayers])

  // Current slot assignments as pid map
  const currentAssignments = useMemo(() => {
    const map = {}
    for (const slot of SLOTS) map[slot.id] = activeLineup[slot.id]?.pid ?? null
    return map
  }, [activeLineup])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleSlotDragStart = useCallback((pid, slotId) => {
    setDragging({ pid, fromSlot: slotId })
  }, [])

  const handleBenchDragStart = useCallback((pid) => {
    setDragging({ pid, fromSlot: 'bench' })
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragging(null)
    setDropTarget(null)
  }, [])

  const handleSlotDragOver = useCallback((e, slotId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(slotId)
  }, [])

  const handleSlotDrop = useCallback((e, targetSlotId) => {
    e.preventDefault()
    if (!dragging) { setDropTarget(null); return }

    const { pid: dragPid, fromSlot } = dragging
    const targetOccupant = currentAssignments[targetSlotId]

    setOverrides(prev => {
      const base = prev ?? Object.fromEntries(SLOTS.map(s => [s.id, currentAssignments[s.id]]))
      const next = { ...base }

      if (fromSlot === 'bench') {
        // Bench → slot: bench player takes the slot, displaced player goes to bench
        next[targetSlotId] = dragPid
      } else {
        // Slot → slot: swap
        next[targetSlotId] = dragPid
        next[fromSlot]     = targetOccupant  // may be null if target was empty
      }
      return next
    })

    setDragging(null)
    setDropTarget(null)
  }, [dragging, currentAssignments])

  const handleBenchDrop = useCallback((e) => {
    e.preventDefault()
    if (!dragging || dragging.fromSlot === 'bench') { setDragging(null); setDropTarget(null); return }
    // Drag from slot to bench: remove from lineup
    const { fromSlot } = dragging
    setOverrides(prev => {
      const base = prev ?? Object.fromEntries(SLOTS.map(s => [s.id, currentAssignments[s.id]]))
      return { ...base, [fromSlot]: null }
    })
    setDragging(null); setDropTarget(null)
  }, [dragging, currentAssignments])

  // Preview rating: what would the dragged player get at the hovered slot?
  const previewRatings = useMemo(() => {
    if (!dragging || !dropTarget) return {}
    const slot = SLOTS.find(s => s.id === dropTarget)
    if (!slot) return {}
    const r = composites[dragging.pid]?.[slot.type]?.rating
    return r != null ? { [dropTarget]: r } : {}
  }, [dragging, dropTarget, composites])

  // Tactical summary
  const starters    = SLOTS.map(s => activeLineup[s.id]).filter(Boolean)
  const avgCBrating = starters.filter(e => e.slotType === 'CB').reduce((a, e) => a + e.rating, 0) / Math.max(starters.filter(e => e.slotType === 'CB').length, 1)
  const avgMFrating = starters.filter(e => ['CM','WM'].includes(e.slotType)).reduce((a, e) => a + e.rating, 0) / Math.max(starters.filter(e => ['CM','WM'].includes(e.slotType)).length, 1)
  const avgSTrating = starters.filter(e => e.slotType === 'ST').reduce((a, e) => a + e.rating, 0) / Math.max(starters.filter(e => e.slotType === 'ST').length, 1)
  const overallRating = starters.length ? starters.reduce((a, e) => a + e.rating, 0) / starters.length : 0
  const poorCount   = starters.filter(e => e.rating < POOR_FIT).length
  const isModified  = !!overrides

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ background: '#000', color: '#fdc300', padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Suggested Starting XI — 4-4-2</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isModified && (
            <button
              onClick={() => setOverrides(null)}
              style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', background: '#fdc300', color: '#000', border: 'none', cursor: 'pointer' }}
            >
              ↺ Reset
            </button>
          )}
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
            All Matches · P90 &nbsp;|&nbsp; Squad Rating: <span style={{ color: '#fdc300', fontSize: 11 }}>{overallRating.toFixed(0)}</span>/100
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

        {/* ── Interactive Pitch ───────────────────────────────────────── */}
        <div style={{ flex: '0 0 50%', borderRight: '2px solid #000' }}>
          {/*
            Use CSS aspect-ratio so the wrapper height EXACTLY matches a
            portrait pitch (width × 105/68). Both the canvas and the token
            overlay are positioned inside this wrapper, so their dimensions
            are guaranteed identical regardless of any parent flex stretching.
          */}
          <div
            ref={pitchRef}
            style={{ position: 'relative', width: '100%', aspectRatio: '68 / 105' }}
          >
            <PitchBackground />

            {/* Token overlay — exactly covers the pitch wrapper */}
            <div
              style={{ position: 'absolute', inset: 0 }}
              onDragOver={e => e.preventDefault()}
            >
              {SLOTS.map(slot => {
                const entry    = activeLineup[slot.id]
                const isSrc    = dragging?.fromSlot === slot.id
                const isTarget = dropTarget === slot.id
                const preview  = previewRatings[slot.id]

                return (
                  <div
                    key={slot.id}
                    onDragOver={e => handleSlotDragOver(e, slot.id)}
                    onDrop={e => handleSlotDrop(e, slot.id)}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'all' }}>
                      <PitchToken
                        slot={slot}
                        entry={entry}
                        isDragging={isSrc}
                        isDropTarget={isTarget}
                        previewRating={isTarget ? preview : undefined}
                        onDragStart={() => entry && handleSlotDragStart(entry.pid, slot.id)}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend — sits below the canvas, outside the positioned wrapper */}
          <div style={{ padding: '5px 12px', background: '#ffffff', borderTop: '1px solid rgba(0,0,0,0.15)', fontSize: 8, color: 'rgba(0,0,0,0.6)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>⇄ Drag players to swap positions</span>
            <span style={{ color: '#000000', fontWeight: 700 }}>● Poor fit (&lt;{POOR_FIT})</span>
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Starting XI list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ background: '#ffffff', borderBottom: '2px solid #000', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' }}>Starting XI — drag to rearrange</span>
              <span style={{ fontSize: 7, color: 'rgba(0,0,0,0.35)', letterSpacing: 1, textTransform: 'uppercase' }}>Rating shown = composite for each position</span>
            </div>
            {SLOTS.map(slot => {
              const entry = activeLineup[slot.id]
              if (!entry) return null
              const isPoor = entry.rating < POOR_FIT
              const name   = entry.player?.player?.player_name ?? entry.player?.player_name ?? 'Unknown'
              const jersey = entry.player?.jersey_no ?? '?'
              return (
                <div
                  key={slot.id}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; handleSlotDragStart(entry.pid, slot.id) }}
                  onDragEnd={handleDragEnd}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '6px 10px', display: 'flex', gap: 7, alignItems: 'flex-start', background: '#fff', cursor: 'grab' }}
                >
                  <div style={{ minWidth: 36, background: posColors[slot.type] ?? '#000000', color: (posColors[slot.type] ?? '#000000') === '#fdc300' ? '#000' : '#fff', fontSize: 7, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 2px', textAlign: 'center', flexShrink: 0, marginTop: 1 }}>
                    {slot.label}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, opacity: 0.4 }}>#{jersey}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{name}</span>
                      {isPoor && <span style={{ fontSize: 7, background: '#000000', color: '#fff', padding: '1px 4px', fontWeight: 700 }}>⚠ POOR FIT</span>}
                    </div>
                    {/* Per-position composite ratings */}
                    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                      {['CB','FB','CM','WM','ST'].map(type => {
                        const r = Math.round(composites[entry.pid]?.[type]?.rating ?? 0)
                        const isAssigned = slot.type === type
                        const typeColor = posColors[type] ?? '#000000'
                        return (
                          <div key={type} style={{ textAlign: 'center', minWidth: 26 }}>
                            <div style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: isAssigned ? (typeColor === '#fdc300' ? '#000' : '#fff') : 'rgba(0,0,0,0.5)', background: isAssigned ? typeColor : 'rgba(0,0,0,0.1)', padding: '1px 2px', borderRadius: 2 }}>
                              {type}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: isAssigned ? typeColor : 'rgba(0,0,0,0.4)' }}>
                              {r}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {(entry.top2 ?? []).map((m, i) => (
                      <div key={i} style={{ fontSize: 7.5, color: 'rgba(0,0,0,0.6)', marginTop: 2 }}>
                        <span style={{ color: i === 0 ? '#006032' : '#000000', fontWeight: 700, marginRight: 3 }}>#{i + 1}</span>
                        {m.label}: {fmtVal(m.key, m.rawVal)} ({Math.round(m.pct)}th pct)
                      </div>
                    ))}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'center', paddingLeft: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: isPoor ? '#000000' : Math.round(entry.rating) >= 65 ? '#006032' : 'rgba(0,0,0,0.6)', lineHeight: 1 }}>{Math.round(entry.rating)}</div>
                    <div style={{ fontSize: 7, color: 'rgba(0,0,0,0.4)' }}>/100</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Rating bars */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '8px 10px', background: '#ffffff', display: 'flex', gap: 8 }}>
            {[{ label:'Defense', val:avgCBrating, color:'#000000' }, { label:'Midfield', val:avgMFrating, color:'#fdc300' }, { label:'Attack', val:avgSTrating, color:'#006032' }]
              .map(({ label, val, color }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 7, color: 'rgba(0,0,0,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                  <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color, marginTop: 2 }}>{val.toFixed(0)}</div>
                </div>
              ))}
          </div>

          {/* Tactical note — on a black background, so use gold/white/green
              (dark-safe) instead of the light-background posColors above. */}
          <div style={{ borderTop: '2px solid #000', padding: '8px 12px', background: '#000', color: 'rgba(255,255,255,0.75)', fontSize: 8.5, lineHeight: 1.7 }}>
            <div style={{ color: '#fdc300', fontWeight: 700, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Tactical Analysis</div>
            Defense <strong style={{ color: '#ffffff' }}>{avgCBrating.toFixed(0)}/100</strong> · Midfield <strong style={{ color: '#fdc300' }}>{avgMFrating.toFixed(0)}/100</strong> · Attack <strong style={{ color: '#ffffff' }}>{avgSTrating.toFixed(0)}/100</strong>.
            {poorCount > 0
              ? ` ⚠ ${poorCount} player${poorCount > 1 ? 's' : ''} rated below ${POOR_FIT}.`
              : ' ✓ All selections meet positional fit threshold.'
            }
            {isModified && <span style={{ color: '#fdc300' }}> (Custom lineup — reset to restore algorithm.)</span>}
          </div>

          {/* Bench — draggable onto pitch */}
          <div
            style={{ borderTop: '2px solid #000' }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleBenchDrop}
          >
            <div style={{ background: '#000', color: '#fdc300', padding: '4px 12px', fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>Bench — drag onto pitch to try</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>Rating shown = composite for each position</span>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 240 }}>
              {benchPlayers.map(player => {
                const pid  = player.player_id
                const name = player.player?.player_name ?? player.player_name ?? 'Unknown'
                const s    = allStats[pid] ?? {}
                const isDraggingThis = dragging?.pid === pid

                // Best rating across all positions
                const bestEntry = Object.entries(composites[pid] ?? {})
                  .sort((a, b) => b[1].rating - a[1].rating)[0]
                const bestType   = bestEntry?.[0] ?? '—'
                const bestRating = Math.round(bestEntry?.[1]?.rating ?? 0)

                return (
                  <div
                    key={pid}
                    draggable
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; handleBenchDragStart(pid) }}
                    onDragEnd={handleDragEnd}
                    style={{
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                      padding: '6px 12px',
                      display: 'flex', gap: 8, alignItems: 'center',
                      background: isDraggingThis ? 'rgba(253,195,0,0.15)' : '#fff',
                      cursor: 'grab',
                      opacity: isDraggingThis ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 9, opacity: 0.4, minWidth: 22 }}>#{player.jersey_no ?? '—'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>{name}</span>

                    {/* Ratings per position type */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['CB','FB','CM','WM','ST'].map(type => {
                        const r   = Math.round(composites[pid]?.[type]?.rating ?? 0)
                        const isBest = type === bestType
                        return (
                          <div key={type} style={{ textAlign: 'center', minWidth: 28 }}>
                            <div style={{ fontSize: 6, color: 'rgba(0,0,0,0.35)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{type}</div>
                            <div style={{
                              fontSize: 9, fontWeight: 700,
                              color: r >= 65 ? '#006032' : r >= POOR_FIT ? 'rgba(0,0,0,0.6)' : '#000000',
                              background: isBest ? 'rgba(253,195,0,0.2)' : 'transparent',
                              borderRadius: 2, padding: '0 2px',
                            }}>
                              {r}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
