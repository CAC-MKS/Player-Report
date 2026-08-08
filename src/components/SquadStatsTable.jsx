import { useState, useMemo } from 'react'

const FONT = 'var(--font)'

const COLUMNS = [
  { key: 'jersey_no',      label: '#',                   numeric: true  },
  { key: 'player_name',    label: 'Player',               numeric: false },
  { key: 'mp',             label: 'MP',                   numeric: true, aggregateOnly: true },
  { key: 'totalPasses',    label: 'Passes',               numeric: true  },
  { key: 'passAccuracy',   label: 'Pass%',                numeric: true  },
  { key: 'completePasses', label: 'Pass Completed',       numeric: true  },
  { key: 'progPasses',     label: 'Prog. Passes',         numeric: true  },
  { key: 'ballRecovery',   label: 'Ball Recovery',        numeric: true  },
  { key: 'duelsWon',       label: 'Duels Won',            numeric: true  },
  { key: 'tackles',        label: 'Tackles',              numeric: true  },
  { key: 'interceptions',  label: 'Interceptions',        numeric: true  },
  { key: 'foulsCommitted', label: 'Fouls',                numeric: true  },
  { key: 'goals',          label: 'Goals',                numeric: true  },
  { key: 'totalShots',     label: 'Shots',                numeric: true  },
  { key: 'totalXG',        label: 'xG',                   numeric: true  },
  { key: 'progCarry',      label: 'Prog. Carry',          numeric: true  },
  { key: 'defContrib',     label: 'Def. Contribution%',   numeric: true  },
  { key: 'attContrib',     label: 'Att. Contribution%',   numeric: true  },
]

// Raw defensive score for a row (used for contribution calc)
function defScore(row) {
  return (row.duelsWon ?? 0) + (row.tackles ?? 0) + (row.interceptions ?? 0) + (row.ballRecovery ?? 0)
}

// Raw attacking score for a row
function attScore(row) {
  return (row.goals ?? 0) + (row.totalShots ?? 0) + (row.totalXG ?? 0) + (row.progPasses ?? 0) + (row.progCarry ?? 0)
}

function getStats(pid, allStats) {
  const s = allStats[pid]
  if (!s) return null
  return {
    totalPasses:    s.totalPasses    ?? 0,
    passAccuracy:   s.passAccuracy   ?? 0,
    completePasses: s.completePasses ?? 0,
    progPasses:     s.progPasses     ?? 0,
    ballRecovery:   (s.tackles ?? 0) + (s.interceptions ?? 0) + (s.clearances ?? 0) + (s.blocks ?? 0),
    duelsWon:       s.duelsWon       ?? 0,
    tackles:        s.tackles        ?? 0,
    interceptions:  s.interceptions  ?? 0,
    foulsCommitted: s.foulsCommitted ?? 0,
    goals:          s.goals          ?? 0,
    totalShots:     s.totalShots     ?? 0,
    totalXG:        s.totalXG        ?? 0,
    progCarry:      (s.succDribbles  ?? 0) + (s.carriesIntoFT ?? 0),
    mp:             s.matchesPlayed  ?? null,
  }
}

export default function SquadStatsTable({ lineups, allStats, statsByMatch, matches, selectedMatchId }) {
  const [sortKey, setSortKey] = useState('jersey_no')
  const [sortAsc, setSortAsc] = useState(true)

  const activeMatchId = selectedMatchId ?? null

  const activeStats = useMemo(() => {
    if (activeMatchId) return statsByMatch[activeMatchId] ?? {}
    return allStats
  }, [activeMatchId, allStats, statsByMatch])

  const activeLineups = useMemo(() => {
    if (!activeMatchId) return lineups
    const matchStats = statsByMatch[activeMatchId] ?? {}
    return lineups.filter(l => matchStats[l.player_id] != null || true)
  }, [activeMatchId, lineups, statsByMatch])

  const isAggregate = !activeMatchId

  // Build base rows (without contribution columns)
  const baseRows = useMemo(() => {
    return activeLineups.map(l => {
      const pid = l.player_id
      const stats = getStats(pid, activeStats)
      const hasData = stats != null
      return {
        player_id: pid,
        jersey_no: l.jersey_no ?? 999,
        player_name: l.player?.player_name ?? 'Unknown',
        hasData,
        ...(hasData ? stats : {
          totalPasses: 0, passAccuracy: 0, completePasses: 0,
          progPasses: 0, ballRecovery: 0, duelsWon: 0,
          tackles: 0, interceptions: 0, foulsCommitted: 0,
          goals: 0, totalShots: 0, totalXG: 0, progCarry: 0, mp: null,
        }),
      }
    })
  }, [activeLineups, activeStats])

  // Compute contribution columns across all players with data
  const rows = useMemo(() => {
    const withData = baseRows.filter(r => r.hasData)
    const totalDef = withData.reduce((sum, r) => sum + defScore(r), 0)
    const totalAtt = withData.reduce((sum, r) => sum + attScore(r), 0)

    return baseRows.map(row => ({
      ...row,
      defContrib: row.hasData && totalDef > 0
        ? Math.round((defScore(row) / totalDef) * 100)
        : null,
      attContrib: row.hasData && totalAtt > 0
        ? Math.round((attScore(row) / totalAtt) * 100)
        : null,
    }))
  }, [baseRows])

  // Sort
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let va = a[sortKey]
      let vb = b[sortKey]
      if (sortKey === 'player_name') {
        va = va ?? ''
        vb = vb ?? ''
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      va = va ?? 0
      vb = vb ?? 0
      return sortAsc ? va - vb : vb - va
    })
  }, [rows, sortKey, sortAsc])

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(a => !a)
    } else {
      setSortKey(key)
      setSortAsc(key === 'jersey_no' || key === 'player_name')
    }
  }

  const visibleCols = isAggregate
    ? COLUMNS
    : COLUMNS.filter(c => !c.aggregateOnly)

  const thStyle = (key) => ({
    padding: '6px 8px',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: FONT,
    fontWeight: 700,
    color: key === 'defContrib' ? '#48CAE4' : key === 'attContrib' ? '#FFD166' : '#FFD166',
    background: key === 'defContrib' ? '#023E8A' : key === 'attContrib' ? '#D90429' : '#000',
    border: '1px solid #222',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    textAlign: key === 'player_name' ? 'left' : 'center',
  })

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '2px solid #000',
          fontSize: 12,
          fontFamily: FONT,
        }}>
          <thead>
            <tr>
              {visibleCols.map(col => (
                <th
                  key={col.key}
                  style={thStyle(col.key)}
                  onClick={() => handleSort(col.key)}
                  title={`Sort by ${col.label}`}
                >
                  {col.label}
                  {sortKey === col.key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.player_id}
                style={{
                  opacity: !row.hasData ? 0.35 : 1,
                  background: i % 2 === 0 ? '#fff' : '#f5f5f5',
                }}
              >
                {visibleCols.map(col => {
                  let val = row[col.key]
                  if (col.key === 'passAccuracy')  val = val != null ? val + '%' : '—'
                  else if (col.key === 'totalXG')  val = val != null ? Number(val).toFixed(2) : '—'
                  else if (col.key === 'mp')        val = val != null ? val : '—'
                  else if (col.key === 'defContrib' || col.key === 'attContrib')
                                                    val = val != null ? val + '%' : '—'
                  else if (!row.hasData && col.key !== 'player_name' && col.key !== 'jersey_no') val = '—'
                  else if (val == null)             val = '—'

                  const isContrib = col.key === 'defContrib' || col.key === 'attContrib'
                  const contribColor = col.key === 'defContrib' ? '#023E8A' : '#D90429'

                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        textAlign: col.numeric ? 'center' : 'left',
                        fontWeight: col.numeric ? 700 : 400,
                        fontSize: col.numeric ? 12 : 11,
                        whiteSpace: 'nowrap',
                        color: isContrib ? contribColor : '#000',
                        background: isContrib ? (col.key === 'defContrib' ? '#eef4ff' : '#fff5f5') : 'inherit',
                      }}
                    >
                      {col.key === 'jersey_no'
                        ? <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>{val}</span>
                        : val
                      }
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
