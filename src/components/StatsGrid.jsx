function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent)' : 'var(--white)',
      border: '2px solid var(--black)',
      borderRadius: 6,
      padding: '10px 12px',
      minWidth: 90,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 10, fontFamily: 'var(--font)', marginTop: 3, opacity: 0.7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, fontFamily: 'var(--font)', opacity: 0.55, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--font)', fontWeight: 700, fontSize: 12,
        letterSpacing: 1, textTransform: 'uppercase',
        borderLeft: `4px solid ${color}`, paddingLeft: 8, marginBottom: 10
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

export default function StatsGrid({ s, teamColor }) {
  const isGK = s.saves > 0 && s.totalShots === 0

  return (
    <div>
      {/* Passing */}
      <Section title="Passing" color={teamColor}>
        <StatCard label="Total Passes" value={s.totalPasses} />
        <StatCard label="Accuracy" value={`${s.passAccuracy}%`} accent />
        <StatCard label="Complete" value={s.completePasses} sub={`${s.incompletePasses} incomplete`} />
        <StatCard label="Key Passes" value={s.keyPasses} />
        <StatCard label="Assists" value={s.assists} />
        <StatCard label="Prog Passes" value={s.progPasses} sub={`${s.successProgPasses} successful`} />
        <StatCard label="Long Balls" value={s.longBalls} sub={`${s.successLongBalls} success`} />
        <StatCard label="Into Box" value={s.passesIntoBox} sub={`${s.successPassesIntoBox} success`} />
        {s.crosses > 0 && <StatCard label="Crosses" value={s.crosses} sub={`${s.successCrosses} success`} />}
        <StatCard label="Own Half" value={s.ownHalfPasses} sub={`${s.succOwnHalfPasses} succ`} />
        <StatCard label="Opp Half" value={s.oppHalfPasses} sub={`${s.succOppHalfPasses} succ`} />
      </Section>

      {/* Shooting (outfield) */}
      {!isGK && (
        <Section title="Shooting" color={teamColor}>
          <StatCard label="Shots" value={s.totalShots} />
          <StatCard label="On Target" value={s.shotsOnTarget} />
          <StatCard label="Goals" value={s.goals} accent={s.goals > 0} />
          <StatCard label="xG" value={s.totalXG} />
          <StatCard label="xGOT" value={s.totalXGOT} />
          {s.totalShots > 0 && (
            <StatCard label="Conv Rate" value={`${s.totalShots > 0 ? Math.round((s.goals / s.totalShots) * 100) : 0}%`} />
          )}
        </Section>
      )}

      {/* Goalkeeper */}
      {isGK && (
        <Section title="Goalkeeping" color={teamColor}>
          <StatCard label="Saves" value={s.saves} accent />
          <StatCard label="Gripping" value={s.grippingSaves} sub="regained poss" />
        </Section>
      )}

      {/* Defending */}
      <Section title="Defending" color={teamColor}>
        <StatCard label="Tackles" value={s.tackles} sub={`${s.succTackles} won`} />
        <StatCard label="Tackle Win%" value={s.tackles > 0 ? `${Math.round((s.succTackles / s.tackles) * 100)}%` : '—'} accent={s.succTackles > 0} />
        <StatCard label="Intercepts" value={s.interceptions} sub={`${s.intRegain} poss regained`} />
        <StatCard label="Blocks" value={s.blocks} />
        <StatCard label="Clearances" value={s.clearances} />
        <StatCard label="Aerial Duels" value={s.aerialDuels} />
        <StatCard label="Pressures" value={s.pressures} />
      </Section>

      {/* Ball Carrying */}
      <Section title="Ball Carrying & Dribbling" color={teamColor}>
        <StatCard label="Dribbles" value={s.dribbles} sub={`${s.succDribbles} success`} />
        <StatCard label="Dribble%" value={s.dribbles > 0 ? `${s.dribbleRate}%` : '—'} accent={s.dribbleRate > 50} />
        <StatCard label="Carries" value={s.carries} />
        <StatCard label="Into Fin 3rd" value={s.carriesIntoFT} />
        <StatCard label="Into Box" value={s.carriesIntoBox} />
        <StatCard label="Ball Control" value={s.ballControl} />
      </Section>
    </div>
  )
}
