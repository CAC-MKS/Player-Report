import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useMatchData, TEAM_IDS } from './hooks/useMatchData.js'
import { hasCredentials, supabase } from './lib/supabase.js'
import PlayerReport from './components/PlayerReport.jsx'
import HeatMap from './components/HeatMap.jsx'
import { useT } from './utils/translations.js'
import PassNetwork from './components/PassNetwork.jsx'
import SquadStatsTable from './components/SquadStatsTable.jsx'
import LineupSuggestion from './components/LineupSuggestion.jsx'
import AveragePitchLocations from './components/AveragePitchLocations.jsx'
import ProgressionTab from './components/ProgressionTab.jsx'
import Login from './components/Login.jsx'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import mksCrest from './assets/mks-crest.png'

const S = {
  navBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    background: '#006032',
    color: '#fff',
    borderBottom: '4px solid #000',
    padding: '0 20px',
    height: 48,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navTitle: {
    fontFamily: 'var(--font)',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#fdc300',
    paddingRight: 24,
    borderRight: '2px solid #006032',
    marginRight: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  modeBtn: (active) => ({
    fontFamily: 'var(--font)',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    background: active ? '#fdc300' : 'transparent',
    color: active ? '#000' : '#fff',
    border: '2px solid',
    borderColor: active ? '#fdc300' : 'rgba(255,255,255,0.4)',
    padding: '6px 14px',
    cursor: 'pointer',
    marginRight: 8,
  }),
  sidebar: {
    width: 220,
    minWidth: 220,
    background: '#000',
    color: '#fff',
    borderRight: '4px solid #000',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 48,
    height: 'calc(100vh - 48px)',
    overflowY: 'auto',
  },
  sideHeader: {
    padding: '16px 14px 12px',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
  },
  sectionLabel: {
    padding: '8px 14px 4px',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 700,
    fontFamily: 'var(--font)',
  },
  playerRow: (selected, color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    cursor: 'pointer',
    background: selected ? color : 'transparent',
    borderLeft: selected ? `4px solid ${color === '#fdc300' ? '#000' : '#fdc300'}` : '4px solid transparent',
    color: selected ? (color === '#fdc300' ? '#000' : '#fff') : 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontFamily: 'var(--font)',
    fontWeight: 700,
    textTransform: 'uppercase',
    transition: 'none',
  }),
  downloadBtn: (disabled) => ({
    background: disabled ? 'rgba(0,0,0,0.3)' : '#fdc300',
    color: '#000',
    border: '2px solid #000',
    fontFamily: 'var(--font)',
    fontWeight: 700,
    fontSize: 11,
    padding: '7px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 1,
    textTransform: 'uppercase',
  }),
  topBar: {
    background: '#fdc300',
    borderBottom: '4px solid #000',
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
}

const B  = '2px solid #000'
const BT = '4px solid #000'
const FONT = 'var(--font)'

/** One VS row */
function CompareRow({ label, valA, valB, isSection }) {
  if (isSection) {
    return (
      <div style={{ background: '#000', color: '#fdc300', padding: '5px 14px', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT, display: 'flex', alignItems: 'center' }}>
        {label}
      </div>
    )
  }

  const numA = parseFloat(valA)
  const numB = parseFloat(valB)
  const isNum = !isNaN(numA) && !isNaN(numB) && valA !== '—' && valB !== '—'
  const aWins = isNum && numA > numB
  const bWins = isNum && numB > numA

  // Whichever side has the better value gets a green "winning" wash — no team
  // colors here, just a success/positive highlight on whichever number wins.
  return (
    <div style={{ display: 'flex', borderBottom: B, minHeight: 44 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', background: aWins ? 'rgba(0,96,50,0.08)' : '#fff' }}>
        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: aWins ? '#006032' : '#000' }}>{valA}</span>
      </div>
      <div style={{ width: 200, minWidth: 160, borderLeft: B, borderRight: B, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px', background: '#ffffff', flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: FONT, color: '#000' }}>{label}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', background: bWins ? 'rgba(0,96,50,0.08)' : '#fff' }}>
        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: bWins ? '#006032' : '#000' }}>{valB}</span>
      </div>
    </div>
  )
}

/** Full-width comparison table shown in compare mode — covers all action types */
function FullComparison({ statsA, statsB, lineupA, lineupB, t }) {
  if (!statsA && !statsB) return null

  const nameA = lineupA?.player?.player_name ?? 'PLAYER 1'
  const nameB = lineupB?.player?.player_name ?? 'PLAYER 2'

  const pct = (made, total, s) =>
    s ? (total > 0 ? Math.round((made / total) * 100) + '%' : '0%') : '—'

  const sections = [
    // ── PASSING ──────────────────────────────────────────────────────────
    { label: t('cmpPassing'), isSection: true },
    { label: t('cmpTotalPasses'),         key: 'totalPasses' },
    { label: t('cmpCompletedPasses'),     key: 'completePasses' },
    { label: t('cmpPassAccuracy'),        valA: pct(statsA?.completePasses, statsA?.totalPasses, statsA), valB: pct(statsB?.completePasses, statsB?.totalPasses, statsB) },
    { label: t('cmpProgPasses'),          key: 'progPasses' },
    { label: t('cmpProgCompleted'),       key: 'successProgPasses' },
    { label: t('cmpLongBalls'),           key: 'longBalls' },
    { label: t('cmpLongBallsCompleted'),  key: 'successLongBalls' },
    { label: t('cmpCrosses'),             key: 'crosses' },
    { label: t('cmpCrossesCompleted'),    key: 'successCrosses' },
    { label: t('cmpPassesIntoBox'),       key: 'passesIntoBox' },
    { label: t('cmpKeyPasses'),           key: 'keyPasses' },
    { label: t('cmpAssists'),             key: 'assists' },
    { label: t('cmpIncompletePasses'),    key: 'incompletePasses' },
    { label: t('cmpOwnHalf'),             key: 'ownHalfPasses' },
    { label: t('cmpOppHalf'),             key: 'oppHalfPasses' },

    // ── ATTACKING / SHOOTING ─────────────────────────────────────────────
    { label: t('cmpAttacking'), isSection: true },
    { label: t('cmpGoals'),               key: 'goals' },
    { label: t('cmpTotalShots'),          key: 'totalShots' },
    { label: t('cmpShotsOnTarget'),       key: 'shotsOnTarget' },
    { label: t('cmpXg'),                  key: 'totalXG' },
    { label: t('cmpXgot'),                key: 'totalXGOT' },
    { label: t('cmpConversion'),          valA: statsA?.totalShots > 0 ? Math.round(((statsA.goals ?? 0) / statsA.totalShots) * 100) + '%' : (statsA ? '0%' : '—'), valB: statsB?.totalShots > 0 ? Math.round(((statsB.goals ?? 0) / statsB.totalShots) * 100) + '%' : (statsB ? '0%' : '—') },

    // ── DRIBBLING & CARRIES ──────────────────────────────────────────────
    { label: t('cmpDribbling'), isSection: true },
    { label: t('cmpDribblesAttempted'),   key: 'dribbles' },
    { label: t('cmpDribblesSuccessful'),  key: 'succDribbles' },
    { label: t('cmpDribbleSuccess'),      valA: pct(statsA?.succDribbles, statsA?.dribbles, statsA), valB: pct(statsB?.succDribbles, statsB?.dribbles, statsB) },
    { label: t('cmpCarriesFinal3rd'),     key: 'carriesIntoFT' },
    { label: t('cmpCarriesBox'),          key: 'carriesIntoBox' },
    { label: t('cmpBallControls'),        key: 'ballControl' },

    // ── DEFENSIVE ────────────────────────────────────────────────────────
    { label: t('cmpDefensive'), isSection: true },
    { label: t('cmpTotalTackles'),        key: 'tackles' },
    { label: t('cmpTacklesWon'),          key: 'succTackles' },
    { label: t('cmpTacklesPossession'),   key: 'tackleRegain' },
    { label: t('cmpTackleSuccess'),       valA: pct(statsA?.succTackles, statsA?.tackles, statsA), valB: pct(statsB?.succTackles, statsB?.tackles, statsB) },
    { label: t('cmpInterceptions'),       key: 'interceptions' },
    { label: t('cmpInterceptionsRegained'), key: 'intRegain' },
    { label: t('cmpAerialDuels'),         key: 'aerialDuels' },
    { label: t('cmpBlocks'),              key: 'blocks' },
    { label: t('cmpClearances'),          key: 'clearances' },
    { label: t('cmpPressures'),           key: 'pressures' },
    { label: t('cmpSaves'),               key: 'saves' },
    {
      label: t('cmpTotalDefActions'),
      valA: statsA ? (statsA.tackles ?? 0) + (statsA.interceptions ?? 0) + (statsA.blocks ?? 0) + (statsA.clearances ?? 0) : '—',
      valB: statsB ? (statsB.tackles ?? 0) + (statsB.interceptions ?? 0) + (statsB.blocks ?? 0) + (statsB.clearances ?? 0) : '—',
    },
  ].map(r => r.isSection ? r : ({
    label: r.label,
    valA: r.valA !== undefined ? r.valA : (statsA != null ? (statsA[r.key] ?? 0) : '—'),
    valB: r.valB !== undefined ? r.valB : (statsB != null ? (statsB[r.key] ?? 0) : '—'),
  }))

  return (
    <div style={{ borderTop: BT, background: '#fff' }}>
      {/* Master header — Player 1 = gold, Player 2 = black (matches the
          selection accent used everywhere else, not a team-identity color) */}
      <div style={{ display: 'flex', borderBottom: BT }}>
        <div style={{ flex: 1, background: '#fdc300', color: '#000', padding: '10px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT }}>
          {nameA}
        </div>
        <div style={{ width: 200, minWidth: 160, background: '#000', color: '#fdc300', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT, flexShrink: 0 }}>
          VS
        </div>
        <div style={{ flex: 1, background: '#000', color: '#fff', padding: '10px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT, textAlign: 'right' }}>
          {nameB}
        </div>
      </div>

      {sections.map((row, i) => (
        <CompareRow key={i} label={row.label} valA={row.valA} valB={row.valB} isSection={row.isSection} />
      ))}
    </div>
  )
}

function PlayerRow({ p, allStats, getRowColor, handleSelect, t, showMatchCount = false }) {
  const col          = getRowColor(p.player_id)
  const stats        = allStats[p.player_id]
  const matchesPlayed = stats?.matchesPlayed
  return (
    <div onClick={() => handleSelect(p.player_id)} style={S.playerRow(!!col, col || '#fdc300')}>
      <span style={{ minWidth: 18, fontSize: 9, opacity: 0.5, textAlign: 'right' }}>{p.jersey_no ?? '—'}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
        {p.player?.player_name ?? 'Unknown'}
      </span>
      {showMatchCount && matchesPlayed != null && (
        <span style={{ fontSize: 8, background: '#000', color: '#fdc300', padding: '1px 4px', fontWeight: 700, fontFamily: 'var(--font)', letterSpacing: 0.5, flexShrink: 0 }}>
          {matchesPlayed}G
        </span>
      )}
      {!stats && (
        <span style={{ fontSize: 8, background: '#000', color: '#fff', padding: '1px 3px', fontWeight: 700 }}>{t('noData')}</span>
      )}
    </div>
  )
}

// Helper: get the opponent name for MKS in a given match
function getOpponent(match) {
  if (!match) return ''
  return TEAM_IDS.includes(match.home_team_id)
    ? (match.away_team?.team_name ?? 'Unknown')
    : (match.home_team?.team_name ?? 'Unknown')
}

// Helper: short match label for buttons
function matchLabel(match) {
  if (!match) return ''
  const opp  = getOpponent(match)
  const date = match.match_date ? String(match.match_date).slice(0, 10) : ''
  return `vs ${opp}${date ? ' · ' + date : ''}`
}

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      setAuthChecked(true)
    })
    // Listen for sign in / sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!authChecked) return null // wait for session check before rendering

  return (
    <AppInner
      authed={authed}
      onLogin={() => setAuthed(true)}
      onLogout={async () => { await supabase.auth.signOut(); setAuthed(false) }}
    />
  )
}

function AppInner({ authed, onLogin, onLogout }) {
  const { matches, allLineups, lineupsByMatch, aggregatedStats, statsByMatch, loading, error, debug } = useMatchData()

  // null = aggregate (all matches), or a specific match_id
  const [selectedMatchId, setSelectedMatchId] = useState(null)

  // top-level view tab: 'squad' | 'team' | 'player' | 'compare'
  // restricted tabs require login
  const RESTRICTED = ['squad', 'team', 'compare', 'progress']
  const [viewTab, setViewTab] = useState('player')

  const [mode, setMode] = useState('single') // 'single' | 'compare'
  const [playerA, setPlayerA] = useState(null)
  const [playerB, setPlayerB] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [lang, setLang] = useState('en')
  const t = useT(lang)
  const reportRefA = useRef(null)
  const reportRefB = useRef(null)

  // Derived display values based on selected match
  const allStats = selectedMatchId ? (statsByMatch[selectedMatchId] ?? {}) : aggregatedStats
  const lineups  = selectedMatchId ? (lineupsByMatch[selectedMatchId] ?? []) : allLineups
  const match    = selectedMatchId ? (matches.find(m => m.match_id === selectedMatchId) ?? null) : null

  const starters = lineups.filter(l => l.starting_xi)
  const subs     = lineups.filter(l => !l.starting_xi)

  // Reset player selection when match filter changes
  const switchMatch = useCallback((mid) => {
    setSelectedMatchId(mid)
    setPlayerA(null)
    setPlayerB(null)
  }, [])

  const selectedId = mode === 'single' ? playerA : null

  const handleSelect = useCallback((pid) => {
    if (mode === 'single') {
      setPlayerA(pid)
    } else {
      if (!playerA) { setPlayerA(pid); return }
      if (playerA === pid) { setPlayerA(null); return }
      if (!playerB) { setPlayerB(pid); return }
      if (playerB === pid) { setPlayerB(null); return }
      setPlayerA(pid); setPlayerB(null)
    }
  }, [mode, playerA, playerB])

  // Compare mode: Player 1 = gold (matches the single-select accent),
  // Player 2 = black. Not a team-identity distinction — both are MKS players.
  const getRowColor = (pid) => {
    if (mode === 'single') return pid === playerA ? '#fdc300' : null
    if (pid === playerA) return '#fdc300'
    if (pid === playerB) return '#000000'
    return null
  }

  const downloadSingle = useCallback(async (ref, lineup) => {
    if (!ref.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, allowTaint: true })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height / canvas.width) * w
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
      const name = lineup?.player?.player_name?.replace(/\s+/g, '_') ?? 'player'
      pdf.save(`${name}_report.pdf`)
    } finally {
      setDownloading(false)
    }
  }, [])

  if (!hasCredentials) {
    return (
      <div style={{ padding: 40, fontFamily: 'var(--font)', maxWidth: 600, margin: '60px auto', border: '4px solid #000' }}>
        <h2 style={{ marginBottom: 12 }}>SETUP REQUIRED</h2>
        <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file.</p>
      </div>
    )
  }

  const lineupA = lineups.find(l => l.player_id === playerA) ?? null
  const lineupB = lineups.find(l => l.player_id === playerB) ?? null
  const statsA  = playerA ? allStats[playerA] : null
  const statsB  = playerB ? allStats[playerB] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fff' }}>

      {/* ── Top nav ─────────────────────────────────────────── */}
      <nav style={S.navBar}>
        <span style={S.navTitle}>
          <img src={mksCrest} alt="MKS Podlasie" style={{ height: 26, width: 'auto' }} />
          {t('appTitle')}
        </span>

        {/* View tabs */}
        {[
          { key: 'player',  label: 'Player'  },
          { key: 'squad',   label: 'Squad'   },
          { key: 'team',    label: 'Team'    },
          { key: 'compare',  label: 'Compare'     },
          { key: 'progress', label: 'Progression' },
        ].map(({ key, label }) => {
          const locked = RESTRICTED.includes(key) && !authed
          return (
            <button
              key={key}
              style={{ ...S.modeBtn(viewTab === key), opacity: locked ? 0.5 : 1 }}
              onClick={() => {
                if (locked) { setViewTab('__login__'); return }
                setViewTab(key)
                if (key === 'player') setMode('single')
                if (key === 'compare') setMode('compare')
              }}
            >
              {locked ? '🔒 ' : ''}{label}
            </button>
          )
        })}

        {viewTab === 'compare' && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginLeft: 12, fontFamily: 'var(--font)', letterSpacing: 1 }}>
            {playerA && lineups.find(l => l.player_id === playerA)?.player?.player_name
              ? <span style={{ color: '#fdc300' }}>{lineups.find(l => l.player_id === playerA).player.player_name}</span>
              : <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t('selectPlayer1')}</span>
            }
            {' '}<span style={{ color: 'rgba(255,255,255,0.6)' }}>{t('vs')}</span>{' '}
            {playerB && lineups.find(l => l.player_id === playerB)?.player?.player_name
              ? <span style={{ color: '#ffffff' }}>{lineups.find(l => l.player_id === playerB).player.player_name}</span>
              : <span style={{ color: 'rgba(255,255,255,0.6)' }}>{t('selectPlayer2')}</span>
            }
          </span>
        )}

        <div style={{ flex: 1 }} />
        {!loading && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {selectedMatchId ? matchLabel(match) : `All Matches · ${matches.length} games`}
          </span>
        )}
        {/* Language toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          {['en', 'pl'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              fontFamily: 'var(--font)', fontWeight: 700, fontSize: 10, letterSpacing: 1,
              textTransform: 'uppercase', padding: '4px 10px',
              background: lang === l ? '#fdc300' : 'transparent',
              color: lang === l ? '#000' : 'rgba(255,255,255,0.7)',
              border: `2px solid ${lang === l ? '#fdc300' : 'rgba(255,255,255,0.4)'}`,
              cursor: 'pointer',
            }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Auth button */}
        {authed ? (
          <button onClick={onLogout} style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 12px', marginLeft: 8, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '2px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            Logout
          </button>
        ) : (
          <button onClick={() => setViewTab('__login__')} style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 12px', marginLeft: 8, background: '#fdc300', color: '#000', border: '2px solid #fdc300', cursor: 'pointer' }}>
            🔒 Coach Login
          </button>
        )}
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside style={S.sidebar}>
          <div style={S.sideHeader}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: '#fdc300', fontWeight: 700, fontFamily: 'var(--font)', textTransform: 'uppercase', marginBottom: 4 }}>
              MKS Podlasie Sokołów Podlaski
            </div>

            {/* ── Match selector ── */}
            {!loading && matches.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* All matches button */}
                <button
                  onClick={() => switchMatch(null)}
                  style={{
                    fontFamily: 'var(--font)', fontWeight: 700, fontSize: 9, letterSpacing: 1,
                    textTransform: 'uppercase', padding: '5px 8px', cursor: 'pointer',
                    border: '2px solid',
                    borderColor: selectedMatchId === null ? '#fdc300' : 'rgba(255,255,255,0.3)',
                    background: selectedMatchId === null ? '#fdc300' : 'transparent',
                    color: selectedMatchId === null ? '#000' : 'rgba(255,255,255,0.5)',
                    textAlign: 'left',
                  }}
                >
                  ★ All Matches ({matches.length})
                </button>
                {/* Per-match buttons */}
                {matches.map(m => {
                  const active = selectedMatchId === m.match_id
                  const opp  = getOpponent(m)
                  const date = m.match_date ? String(m.match_date).slice(0, 10) : ''
                  const score = m.home_team_score != null
                    ? ` ${m.home_team_score}–${m.away_team_score}`
                    : ''
                  return (
                    <button
                      key={m.match_id}
                      onClick={() => switchMatch(m.match_id)}
                      style={{
                        fontFamily: 'var(--font)', fontWeight: 700, fontSize: 9, letterSpacing: 1,
                        textTransform: 'uppercase', padding: '5px 8px', cursor: 'pointer',
                        border: '2px solid',
                        borderColor: active ? '#fdc300' : 'rgba(255,255,255,0.3)',
                        background: active ? '#fdc300' : 'transparent',
                        color: active ? '#000' : 'rgba(255,255,255,0.5)',
                        textAlign: 'left',
                        lineHeight: 1.4,
                      }}
                    >
                      vs {opp}{score}
                      {date && <span style={{ display: 'block', fontWeight: 400, opacity: 0.7 }}>{date}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Score for selected match */}
            {match?.home_team_score != null && (
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, marginTop: 8, fontFamily: 'var(--font)' }}>
                {match.home_team_score} – {match.away_team_score}
              </div>
            )}
          </div>

          {error && (
            // Black sidebar background — "unsuccessful" is conveyed via a solid
            // black chip behind white text instead of a red color that no
            // longer exists in the palette.
            <div style={{ padding: '8px 14px', fontSize: 10, color: '#fff', background: '#000', fontWeight: 700, fontFamily: 'var(--font)', borderLeft: '4px solid #fdc300' }}>
              ERROR: {error}
            </div>
          )}

          {/* ── DEBUG PANEL ── remove once data loads correctly */}
          {debug && (
            <div style={{ padding: '8px 14px', background: '#000000', borderBottom: '2px solid rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'var(--font)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
              <div style={{ color: '#fdc300', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>DEBUG INFO</div>
              <div>Source: <span style={{ color: debug.evErr ? '#ffffff' : '#006032' }}>{debug.eventSource}{debug.evErr ? ` (ERR: ${debug.evErr})` : ''}</span></div>
              <div>Total events: <span style={{ color: debug.totalEvents > 0 ? '#006032' : '#ffffff' }}>{debug.totalEvents}</span></div>
              <div>Matched events: <span style={{ color: debug.matchedEvents > 0 ? '#006032' : '#ffffff' }}>{debug.matchedEvents}</span></div>
              <div>Lineup players: {debug.lineupPlayerCount}</div>
              <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>Sample event PIDs:</div>
              {debug.sampleEventPids.map((id, i) => <div key={i} style={{ color: 'rgba(255,255,255,0.5)', paddingLeft: 8, fontSize: 8 }}>{id}</div>)}
              <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>Sample lineup PIDs:</div>
              {debug.sampleLineupPids.map((id, i) => <div key={i} style={{ color: 'rgba(255,255,255,0.5)', paddingLeft: 8, fontSize: 8 }}>{id}</div>)}
            </div>
          )}

          {!loading && (viewTab === 'player' || viewTab === 'compare') && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedMatchId
                /* Per-match: show starters / subs */
                ? <>
                    {starters.length > 0 && <div style={S.sectionLabel}>{t('startingXi')}</div>}
                    {starters.map(p => <PlayerRow key={p.lineup_id ?? p.player_id} p={p} allStats={allStats} getRowColor={getRowColor} handleSelect={handleSelect} t={t} />)}
                    {subs.length > 0 && <div style={S.sectionLabel}>{t('substitutes')}</div>}
                    {subs.map(p => <PlayerRow key={p.lineup_id ?? p.player_id} p={p} allStats={allStats} getRowColor={getRowColor} handleSelect={handleSelect} t={t} />)}
                  </>
                /* Aggregate: show all players, grouped by match appearance */
                : <>
                    <div style={S.sectionLabel}>All Players · {matches.length} Matches</div>
                    {lineups.map(p => <PlayerRow key={p.player_id} p={p} allStats={allStats} getRowColor={getRowColor} handleSelect={handleSelect} t={t} showMatchCount />)}
                  </>
              }
            </div>
          )}

          <div style={{ padding: '8px 14px', borderTop: '2px solid rgba(255,255,255,0.15)', fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font)', letterSpacing: 1 }}>
            {lineups.length} {t('players')} · {Object.keys(allStats).length} {t('withData')}
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>

          {/* LOGIN prompt */}
          {viewTab === '__login__' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
              <Login onLogin={() => { onLogin(); setViewTab('squad') }} />
            </div>
          )}

          {/* SQUAD view */}
          {viewTab === 'squad' && (
            <div>
              <div style={{ background: '#000', color: '#fdc300', padding: '8px 20px', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT }}>
                Squad Stats — {selectedMatchId ? matchLabel(match) : `All Matches (${matches.length})`}
              </div>
              {!loading && (
                <>
                  <SquadStatsTable
                    lineups={lineups}
                    allStats={allStats}
                    statsByMatch={statsByMatch}
                    matches={matches}
                    selectedMatchId={selectedMatchId}
                  />
                  <div style={{ border: '2px solid #000', margin: 16 }}>
                    <LineupSuggestion lineups={allLineups} allStats={aggregatedStats} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TEAM view */}
          {viewTab === 'team' && !loading && Object.keys(allStats).length > 0 && (
            <div>
              <div style={{ background: '#000', color: '#fdc300', padding: '8px 20px', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT }}>
                Team Analysis — {selectedMatchId ? matchLabel(match) : `All Matches (${matches.length})`}
              </div>
              <div style={{ border: '2px solid #000', margin: 16 }}>
                <div style={{ background: '#000', color: '#fdc300', padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT }}>
                  Pass Network
                </div>
                <div style={{ padding: 12 }}>
                  <PassNetwork allStats={allStats} lineups={lineups} />
                </div>
                <div style={{ padding: '6px 14px', borderTop: BT, fontFamily: FONT, fontSize: 9, letterSpacing: 1, opacity: 0.5, textTransform: 'uppercase' }}>
                  Circle size = pass accuracy · Line thickness = passes between players
                </div>
              </div>
              <div style={{ border: '2px solid #000', margin: 16 }}>
                <div style={{ background: '#000', color: '#fdc300', padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT }}>
                  Average Position Maps
                </div>
                <AveragePitchLocations allStats={allStats} lineups={lineups} />
              </div>
            </div>
          )}

          {/* PLAYER view (single) */}
          {viewTab === 'player' && mode === 'single' && lineupA && statsA && (
            <>
              <div style={S.topBar}>
                <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {lineupA.player?.player_name}
                  <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 10, opacity: 0.7 }}>
                    #{lineupA.jersey_no} · {lineupA.position ?? lineupA.player?.position ?? ''}
                  </span>
                </span>
                <button
                  style={S.downloadBtn(downloading)}
                  disabled={downloading}
                  onClick={() => downloadSingle(reportRefA, lineupA)}
                >
                  {downloading ? t('generating') : t('downloadPdf')}
                </button>
              </div>
              <PlayerReport
                ref={reportRefA}
                player={lineupA}
                stats={statsA}
                matchInfo={match}
                lineup={lineups}
                allStats={allStats}
                matches={matches}
                lang={lang}
                authed={authed}
                onRequireLogin={() => setViewTab('__login__')}
              />
            </>
          )}

          {/* COMPARE view */}
          {viewTab === 'compare' && (lineupA || lineupB) && (
            <div>
              {/* Side-by-side player cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[
                  { lineup: lineupA, stats: statsA, ref: reportRefA, color: '#fdc300', label: 'PLAYER 1' },
                  { lineup: lineupB, stats: statsB, ref: reportRefB, color: '#000000', label: 'PLAYER 2' },
                ].map(({ lineup, stats, ref, color, label }, i) => (
                  <div key={i} style={{ borderRight: i === 0 ? '4px solid #000' : 'none' }}>
                    <div style={{ ...S.topBar, position: 'relative', top: 'auto', background: color, borderBottom: '4px solid #000' }}>
                      <span style={{ fontWeight: 700, fontSize: 12, fontFamily: 'var(--font)', textTransform: 'uppercase', color: color === '#fdc300' ? '#000' : '#fff', letterSpacing: 1 }}>
                        {lineup ? lineup.player?.player_name : label}
                        {lineup && <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 8, opacity: 0.8 }}>#{lineup.jersey_no}</span>}
                      </span>
                      {lineup && stats && (
                        <button style={{ ...S.downloadBtn(downloading), background: '#fff', color: '#000' }}
                          onClick={() => downloadSingle(ref, lineup)} disabled={downloading}>
                          {t('pdf')}
                        </button>
                      )}
                    </div>
                    {lineup && stats
                      ? <PlayerReport ref={ref} player={lineup} stats={stats} matchInfo={match} lineup={lineups} allStats={allStats} matches={matches} compareColor={color} compact lang={lang} />
                      : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 12, opacity: 0.4 }}>
                          <div style={{ fontSize: 36 }}>⚽</div>
                          <div style={{ fontFamily: 'var(--font)', fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
                            {label === 'PLAYER 1' ? t('selectPlayer1') : t('selectPlayer2')}
                          </div>
                        </div>
                      )
                    }
                  </div>
                ))}
              </div>

              {/* Full-width stats comparison table */}
              <FullComparison statsA={statsA} statsB={statsB} lineupA={lineupA} lineupB={lineupB} t={t} />

              {/* Side-by-side heatmaps */}
              {(statsA || statsB) && (
                <div style={{ borderTop: BT }}>
                  <div style={{ background: '#000', color: '#fdc300', padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT }}>
                    {t('modHeatmap')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ borderRight: BT, padding: 12 }}>
                      {statsA
                        ? <HeatMap events={statsA.allEvents ?? []} teamColor="#fdc300" />
                        : <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontFamily: FONT, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noData')}</div>
                      }
                    </div>
                    <div style={{ padding: 12 }}>
                      {statsB
                        ? <HeatMap events={statsB.allEvents ?? []} teamColor="#000000" />
                        : <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontFamily: FONT, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noData')}</div>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROGRESSION view */}
          {viewTab === 'progress' && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ background: '#000', color: '#fdc300', padding: '8px 20px', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: FONT, flexShrink: 0 }}>
                Player Progression — {matches.length} Matches
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ProgressionTab
                  matches={matches}
                  allLineups={allLineups}
                  statsByMatch={statsByMatch}
                />
              </div>
            </div>
          )}

          {/* Empty state for player/compare */}
          {((viewTab === 'player' && !lineupA) || (viewTab === 'compare' && !lineupA && !lineupB)) && (
            <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                  {loading ? t('loadingMatch') : viewTab === 'compare' ? t('selectTwoPlayers') : t('selectAPlayer')}
                </div>
                {!loading && (
                  <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.4 }}>
                    {selectedMatchId
                      ? matchLabel(match)
                      : `All Matches · ${matches.length} games · MKS Podlasie Sokołów Podlaski`}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
