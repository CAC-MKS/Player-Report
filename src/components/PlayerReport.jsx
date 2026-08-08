import { forwardRef, useState, useMemo } from 'react'
import HeatMap from './HeatMap.jsx'
import RadarChart from './RadarChart.jsx'
import DistributionPitch from './FutsalDistributionPitch.jsx'
import ShotMapPitch from './ShotMapPitch.jsx'
import HighlightTab from './HighlightTab.jsx'
import { buildRadarData } from '../utils/stats.js'
import { useT } from '../utils/translations.js'

const TAB_KEYS = ['tabReport', 'tabHighlights']
const TAB_IDS  = ['REPORT', 'HIGHLIGHTS']

const B  = '2px solid #000'
const BT = '3px solid #000'

function Module({ title, children, style = {} }) {
  return (
    <div style={{ border: BT, marginBottom: 0, ...style }}>
      {title && (
        <div style={{
          background: '#000', color: '#FFD166',
          padding: '4px 10px', fontSize: 9, fontWeight: 700,
          letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font)',
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  )
}

function KPI({ label, value, sub }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 8px',
        textAlign: 'center',
        background: hovered ? '#000' : '#fff',
        color: hovered ? '#FFD166' : '#000',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font)' }}>{value}</div>
      <div style={{ fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 5, fontWeight: 700, fontFamily: 'var(--font)', opacity: hovered ? 0.85 : 0.65 }}>{label}</div>
      {sub != null && (
        <div style={{ fontSize: 8, marginTop: 3, opacity: 0.5, fontFamily: 'var(--font)' }}>{sub}</div>
      )}
    </div>
  )
}

function StatRow({ label, value, sub, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 10px', borderBottom: B, fontFamily: 'var(--font)',
    }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, opacity: 0.75 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {sub != null && <span style={{ fontSize: 9, opacity: 0.4, fontFamily: 'var(--font)' }}>{sub}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: accent ? '#0277B6' : '#000', minWidth: 36, textAlign: 'right' }}>{value}</span>
      </div>
    </div>
  )
}

function PercentBar({ label, made, total, color = '#0277B6' }) {
  const pct = total > 0 ? Math.round((made / total) * 100) : 0
  return (
    <div style={{ padding: '6px 10px', borderBottom: B, fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, opacity: 0.75 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700 }}>{made}/{total} <span style={{ fontSize: 9, opacity: 0.6 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: '#eee', border: '1px solid #ccc' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function AggregateHighlightTab({ events, playerName, matches }) {
  // Pass matches so HighlightTab can switch video automatically when an event is clicked
  return (
    <HighlightTab
      events={events}
      playerName={playerName}
      videoUrl={matches[0]?.video_url ?? null}
      matches={matches}
    />
  )
}

const PlayerReport = forwardRef(function PlayerReport(
  { player, stats, matchInfo, lineup, allStats, matches = [], compareColor, compact, lang = 'en', authed = true, onRequireLogin },
  ref
) {
  const t = useT(lang)
  const [tab, setTab] = useState('REPORT')

  if (!player || !stats) return null

  const playerName   = player.player?.player_name ?? 'Unknown Player'
  const jerseyNumber = player.jersey_no ?? '—'
  const position     = player.position ?? player.player?.position ?? '—'
  const matchesPlayed = stats.matchesPlayed   // present only in aggregate mode
  const isAggregate  = matchesPlayed != null && !matchInfo
  const matchName    = isAggregate ? `${matchesPlayed} Match${matchesPlayed !== 1 ? 'es' : ''}` : (matchInfo?.match_name ?? '—')
  const matchDate    = isAggregate ? 'Aggregate Stats' : (matchInfo?.match_date ?? '—')
  const accentColor  = compareColor ?? '#0277B6'

  const radarData    = buildRadarData(stats, Object.values(allStats ?? {}))
  const hasPassEvents = stats.passEvents?.length > 0
  const hasShotEvents = stats.shotEvents?.length > 0

  // All team events sorted by time — used for receiver inference in pass map
  const allTeamEvents = useMemo(() => {
    return Object.entries(allStats ?? {})
      .flatMap(([pid, s]) => (s.allEvents ?? []).map(e => ({ ...e, _pid: pid })))
      .sort((a, b) => (a.match_time_seconds ?? 0) - (b.match_time_seconds ?? 0))
  }, [allStats])

  // ── COMPACT mode (compare view) — identity + radar + heatmap only ──────
  if (compact) {
    return (
      <div ref={ref} style={{ background: '#fff', fontFamily: 'var(--font)', padding: 12 }}>
        {/* Identity */}
        <div style={{ border: BT, marginBottom: 12, display: 'flex' }}>
          <div style={{
            background: accentColor, color: '#fff', minWidth: 60, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '10px 8px', borderRight: BT,
          }}>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{jerseyNumber}</div>
            <div style={{ fontSize: 7, letterSpacing: 1, marginTop: 3, opacity: 0.85, textTransform: 'uppercase' }}>{t('no')}</div>
          </div>
          <div style={{ flex: 1, padding: '8px 12px' }}>
            <div style={{ fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.5, marginBottom: 2, fontWeight: 700 }}>{t('playerMatchReport')}</div>
            <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.1 }}>{playerName}</div>
            <div style={{ fontSize: 9, marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{position}</span>
              <span style={{ opacity: 0.4, borderLeft: B, paddingLeft: 10 }}>{matchDate}</span>
            </div>
          </div>
          {matchInfo?.home_team_score != null && (
            <div style={{ borderLeft: BT, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 64 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>{matchInfo.home_team_score}–{matchInfo.away_team_score}</div>
              <div style={{ fontSize: 7, letterSpacing: 1, opacity: 0.4, textTransform: 'uppercase' }}>{t('score')}</div>
            </div>
          )}
        </div>

        {/* Radar */}
        <Module title={t('modRadar')}>
          <RadarChart data={radarData} teamColor={accentColor} playerName={playerName} />
        </Module>
      </div>
    )
  }

  // ── FULL (single-player) mode ────────────────────────────────────────────
  return (
    <div ref={ref} style={{ background: '#fff', fontFamily: 'var(--font)', maxWidth: 920, margin: '0 auto', padding: 20 }}>

      {/* ── Identity Module ─────────────────────────────────── */}
      <div style={{ border: BT, marginBottom: 12, display: 'flex' }}>
        <div style={{
          background: accentColor, color: '#fff', minWidth: 70, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '12px 8px', borderRight: BT,
        }}>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{jerseyNumber}</div>
          <div style={{ fontSize: 8, letterSpacing: 1, marginTop: 4, opacity: 0.85, textTransform: 'uppercase' }}>{t('no')}</div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px' }}>
          <div style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.5, marginBottom: 3, fontWeight: 700 }}>{t('playerMatchReport')}</div>
          <div style={{ fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.1 }}>{playerName}</div>
          <div style={{ fontSize: 10, marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{position}</span>
            <span style={{ opacity: 0.5, borderLeft: B, paddingLeft: 14 }}>{matchName}</span>
            <span style={{ opacity: 0.4, borderLeft: B, paddingLeft: 14 }}>{matchDate}</span>
          </div>
        </div>
        {isAggregate
          ? (
            <div style={{ borderLeft: BT, padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>{matchesPlayed}</div>
              <div style={{ fontSize: 8, letterSpacing: 1, opacity: 0.4, textTransform: 'uppercase' }}>Games</div>
            </div>
          )
          : matchInfo?.home_team_score != null && (
            <div style={{ borderLeft: BT, padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>{matchInfo.home_team_score}–{matchInfo.away_team_score}</div>
              <div style={{ fontSize: 8, letterSpacing: 1, opacity: 0.4, textTransform: 'uppercase' }}>{t('score')}</div>
            </div>
          )
        }
      </div>

      {/* ── KPI Hero Stats ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 12, border: BT }}>
        {[
          { label: t('kpiPasses'),    value: stats.totalPasses ?? 0,   sub: `${stats.passAccuracy ?? 0}% ${t('kpiAcc')}` },
          { label: t('kpiGoals'),     value: stats.goals ?? 0,          sub: `xG ${stats.totalXG ?? 0}` },
          { label: t('kpiAssists'),   value: stats.assists ?? 0,        sub: `${stats.keyPasses ?? 0} ${t('kpiKeyPass')}` },
          { label: t('kpiTackles'),   value: stats.tackles ?? 0,       sub: `${stats.succTackles ?? 0} ${t('kpiWon')}` },
          { label: t('kpiIntercept'), value: stats.interceptions ?? 0, sub: null },
          { label: t('kpiDribbles'),  value: stats.dribbles ?? 0,      sub: `${stats.dribbleRate ?? 0}% ${t('kpiSucc')}` },
        ].map(({ label, value, sub }, i) => (
          <div key={label} style={{ borderRight: i < 5 ? B : 'none', display: 'flex' }}>
            <KPI label={label} value={value} sub={sub} />
          </div>
        ))}
      </div>

      {/* ── Tab Nav ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: BT, overflowX: 'auto' }}>
        {TAB_IDS.map((id, i) => {
          const locked = id === 'HIGHLIGHTS' && !authed
          return (
          <button key={id} onClick={() => locked ? onRequireLogin?.() : setTab(id)} style={{
            fontFamily: 'var(--font)', fontWeight: 700, fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', padding: '8px 14px', whiteSpace: 'nowrap',
            background: tab === id ? '#FFD166' : '#fff', color: '#000',
            border: 'none', borderRight: i < TAB_IDS.length - 1 ? B : 'none',
            borderBottom: tab === id ? '3px solid #FFD166' : '3px solid transparent',
            cursor: 'pointer', opacity: locked ? 0.5 : 1,
          }}>
            {locked ? '🔒 ' : ''}{t(TAB_KEYS[i])}
          </button>
        )})}
      </div>

      {/* ── Tab Content ───────────────────────────────────────── */}
      <div style={{ border: BT, borderTop: 'none' }}>

        {/* ══ REPORT — all sections in one scrollable view ══ */}
        {tab === 'REPORT' && (
          <div>

            {/* ── OVERVIEW ──────────────────────────────────────── */}
            <div style={{ background: '#000', color: '#FFD166', padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--font)', borderBottom: B }}>
              {t('tabOverview')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: BT }}>
              <div style={{ borderRight: B }}>
                <Module title={t('modRadar')}>
                  <RadarChart data={radarData} teamColor={accentColor} playerName={playerName} />
                </Module>
              </div>
              <div>
                <Module title={t('modShooting')}>
                  <StatRow label={t('totalShots')}     value={stats.totalShots ?? 0} />
                  <StatRow label={t('shotsOnTarget')}  value={stats.shotsOnTarget ?? 0} accent />
                  <StatRow label={t('goals')}          value={stats.goals ?? 0} accent />
                  <StatRow label={t('xg')}             value={stats.totalXG ?? 0}   sub={t('xgSub')} accent />
                  <StatRow label={t('xgot')}           value={stats.totalXGOT ?? 0} sub={t('xgotSub')} />
                  {(stats.totalShots ?? 0) > 0 && (
                    <StatRow label={t('conversionRate')} value={`${Math.round(((stats.goals ?? 0) / stats.totalShots) * 100)}%`} />
                  )}
                </Module>
                <Module title={t('modDribbling')}>
                  <PercentBar label={t('dribbles')}       made={stats.succDribbles ?? 0} total={stats.dribbles ?? 0} color={accentColor} />
                  <StatRow label={t('carriesFinal3rd')}   value={stats.carriesIntoFT ?? 0} accent />
                  <StatRow label={t('carriesBox')}        value={stats.carriesIntoBox ?? 0} accent />
                  <StatRow label={t('ballControls')}      value={stats.ballControl ?? 0} />
                </Module>
              </div>
            </div>

            {/* ── PASSING & VISION ──────────────────────────────── */}
            <div style={{ background: '#000', color: '#FFD166', padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--font)', borderBottom: B }}>
              {t('tabPassing')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: BT }}>
              <div style={{ borderRight: B }}>
                <Module title={t('modPassing')}>
                  <StatRow label={t('totalPasses')}       value={stats.totalPasses ?? 0} accent />
                  <PercentBar label={t('passAccuracy')}       made={stats.completePasses ?? 0}       total={stats.totalPasses ?? 0}  color={accentColor} />
                  <PercentBar label={t('progressivePasses')}  made={stats.successProgPasses ?? 0}    total={stats.progPasses ?? 0}   color="#09D69F" />
                  <PercentBar label={t('longBalls')}          made={stats.successLongBalls ?? 0}     total={stats.longBalls ?? 0}    color="#888" />
                  <PercentBar label={t('crosses')}            made={stats.successCrosses ?? 0}       total={stats.crosses ?? 0}      color={accentColor} />
                  <PercentBar label={t('passesIntoBox')}      made={stats.successPassesIntoBox ?? 0} total={stats.passesIntoBox ?? 0} color="#FFD166" />
                </Module>
                <Module title={t('modCreative')}>
                  <StatRow label={t('keyPasses')}         value={stats.keyPasses ?? 0} accent />
                  <StatRow label={t('assists')}           value={stats.assists ?? 0}   accent />
                  <StatRow label={t('passesOwnHalf')}     value={stats.ownHalfPasses ?? 0} />
                  <StatRow label={t('passesOppHalf')}     value={stats.oppHalfPasses ?? 0} />
                  <StatRow label={t('incompletePasses')}  value={stats.incompletePasses ?? 0} />
                </Module>
              </div>
              <div style={{ minHeight: 300 }}>
                {hasPassEvents
                  ? <Module title={t('modPassMap')}>
                      <DistributionPitch events={stats.passEvents} teamColor={accentColor} playerName={playerName} players={lineup} allTeamEvents={allTeamEvents} />
                    </Module>
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, opacity: 0.3, fontFamily: 'var(--font)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noPassData')}</div>
                }
              </div>
            </div>

            {/* ── DEFENSIVE ─────────────────────────────────────── */}
            <div style={{ background: '#000', color: '#FFD166', padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--font)', borderBottom: B }}>
              {t('tabDefensive')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: BT }}>
              <div style={{ borderRight: B }}>
                <Module title={t('modTackling')}>
                  <StatRow label={t('totalTackles')}          value={stats.tackles ?? 0} />
                  <StatRow label={t('successful')}            value={stats.succTackles ?? 0} accent />
                  <StatRow label={t('withPossession')}        value={stats.tackleRegain ?? 0} accent />
                  <PercentBar label={t('successRate')} made={stats.succTackles ?? 0} total={stats.tackles ?? 0} color={accentColor} />
                </Module>
                <Module title={t('modInterceptions')}>
                  <StatRow label={t('totalInterceptions')}        value={stats.interceptions ?? 0} accent />
                  <StatRow label={t('withPossessionRegained')}    value={stats.intRegain ?? 0} accent />
                </Module>
                <Module title={t('modDuels')}>
                  <StatRow label={t('aerialDuelsWon')}   value={stats.aerialDuels ?? 0} accent />
                  <StatRow label={t('pressuresApplied')} value={stats.pressures ?? 0} />
                  <StatRow label={t('blocks')}           value={stats.blocks ?? 0} />
                  <StatRow label={t('clearances')}       value={stats.clearances ?? 0} />
                </Module>
              </div>
              <div>
                <Module title={t('modDefSummary')}>
                  <StatRow label={t('totalDefActions')} value={(stats.tackles ?? 0) + (stats.interceptions ?? 0) + (stats.blocks ?? 0) + (stats.clearances ?? 0)} accent />
                  <StatRow label={t('saves')} value={stats.saves ?? 0} />
                </Module>
              </div>
            </div>

            {/* ── HEATMAPS ──────────────────────────────────────── */}
            <div style={{ background: '#000', color: '#FFD166', padding: '6px 14px', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--font)', borderBottom: B }}>
              {t('tabHeatmaps')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ borderRight: B }}>
                <Module title={t('modHeatmap')}>
                  <HeatMap events={stats.allEvents ?? []} teamColor={accentColor} />
                </Module>
              </div>
              <div>
                {hasShotEvents
                  ? <Module title={t('modShotMap')}>
                      <ShotMapPitch shots={stats.shotEvents} playerName={playerName} />
                    </Module>
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, opacity: 0.3, fontFamily: 'var(--font)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('noShots')}</div>
                }
              </div>
            </div>

          </div>
        )}

        {/* ══ HIGHLIGHTS (gated — video clips are a scouting asset) ══ */}
        {tab === 'HIGHLIGHTS' && authed && (
          isAggregate
            ? <AggregateHighlightTab events={stats.allEvents ?? []} playerName={playerName} matches={matches} />
            : <HighlightTab events={stats.allEvents ?? []} playerName={playerName} videoUrl={matchInfo?.video_url ?? null} />
        )}

      </div>
    </div>
  )
})

export default PlayerReport
