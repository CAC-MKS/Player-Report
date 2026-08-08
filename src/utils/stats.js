import { calculateXG, calculateXGOT } from './xg.js'

const SUCCESS = ['Successful', 'Key Pass', 'Assist']

function dist(e) {
  if (e.end_x == null || e.end_y == null) return 0
  return Math.sqrt((e.end_x - e.start_x) ** 2 + (e.end_y - e.start_y) ** 2)
}

function inBox(x, y) {
  return x >= 102 && y >= 20 && y <= 60
}

export function calcPlayerStats(events) {
  // ── Passes ──────────────────────────────────────────────
  const passes = events.filter(e => ['Pass', 'Through Ball'].includes(e.action))
  const totalPasses = passes.length
  const completePasses = passes.filter(e => SUCCESS.includes(e.outcome)).length
  const keyPasses = passes.filter(e => e.outcome === 'Key Pass').length
  const assists = passes.filter(e => e.outcome === 'Assist').length
  const passAccuracy = totalPasses > 0 ? Math.round((completePasses / totalPasses) * 100) : 0

  const passesWithDist = passes.map(e => ({ ...e, _dist: dist(e) }))
  const longBalls = passesWithDist.filter(e => e._dist >= 32)
  const successLongBalls = longBalls.filter(e => SUCCESS.includes(e.outcome)).length

  const progPasses = passes.filter(e => e.end_x != null && e.start_x < e.end_x && (e.end_x - e.start_x) > 15)
  const successProgPasses = progPasses.filter(e => SUCCESS.includes(e.outcome)).length

  const passesIntoBox = passes.filter(e =>
    !inBox(e.start_x, e.start_y) &&
    e.end_x != null && inBox(e.end_x, e.end_y)
  )
  const successPassesIntoBox = passesIntoBox.filter(e => SUCCESS.includes(e.outcome)).length

  const crosses = passes.filter(e =>
    e.start_x >= 80 &&
    (e.start_y <= 12 || e.start_y >= 68) &&
    e.end_x != null && e.end_x >= 104 &&
    e.end_y != null && e.end_y >= 20 && e.end_y <= 60 &&
    e.type !== 'Throw-in'
  )
  const successCrosses = crosses.filter(e => SUCCESS.includes(e.outcome)).length

  const ownHalfPasses = passes.filter(e => e.start_x <= 60)
  const oppHalfPasses = passes.filter(e => e.start_x > 60)

  // ── Shooting ─────────────────────────────────────────────
  const shots = events.filter(e => e.action === 'Shoot')
  const shotsOnTarget = shots.filter(e => ['Goal', 'Save'].includes(e.outcome)).length
  const goals = shots.filter(e => e.outcome === 'Goal').length
  const xgValues = shots.map(s => calculateXG(s))
  const totalXG = xgValues.reduce((a, b) => a + b, 0)
  const xgotValues = shots.map((s, i) => calculateXGOT(s, xgValues[i]))
  const totalXGOT = xgotValues.reduce((a, b) => a + b, 0)

  // ── Defensive ─────────────────────────────────────────────
  const tackles = events.filter(e => ['Standing Tackle', 'Sliding Tackle'].includes(e.action))
  const succTackles = tackles.filter(e => e.outcome === 'Successful').length
  const tackleRegain = tackles.filter(e => e.outcome === 'Successful' && e.type === 'With Possession').length

  const interceptions = events.filter(e => e.action === 'Pass Intercept' && e.outcome === 'Successful')
  const intRegain = interceptions.filter(e => e.type === 'With Possession').length

  const blocks = events.filter(e => e.action === 'Block' && e.outcome === 'Successful')
  const clearances = events.filter(e => e.action === 'Clearance')
  const saves = events.filter(e => e.action === 'Save')
  const grippingSaves = saves.filter(e => e.outcome === 'Gripping').length

  const aerialDuels = events.filter(e =>
    e.action === 'Pass Intercept' && e.outcome === 'Successful' && e.body_part === 'Head'
  ).length

  const pressures = events.filter(e => e.action === 'Pressure')

  // Fouls committed (outcome === 'Foul' on any action)
  const foulsCommitted = events.filter(e => e.outcome === 'Foul').length

  // ── Dribbles & Carries ────────────────────────────────────
  const dribbles = events.filter(e => e.action === 'Dribble')
  const succDribbles = dribbles.filter(e => ['Successful', 'Foul Won'].includes(e.outcome)).length

  const carries = events.filter(e => e.action === 'Carry')
  const carriesIntoFT = carries.filter(e => e.start_x < 80 && e.end_x != null && e.end_x >= 80).length
  const carriesIntoBox = carries.filter(e =>
    !inBox(e.start_x, e.start_y) && e.end_x != null && inBox(e.end_x, e.end_y)
  ).length

  const ballControl = events.filter(e => e.action === 'Ball Control').length

  return {
    // passing
    totalPasses, completePasses,
    incompletePasses: totalPasses - completePasses,
    passAccuracy, keyPasses, assists,
    longBalls: longBalls.length, successLongBalls,
    progPasses: progPasses.length, successProgPasses,
    passesIntoBox: passesIntoBox.length, successPassesIntoBox,
    crosses: crosses.length, successCrosses,
    ownHalfPasses: ownHalfPasses.length,
    succOwnHalfPasses: ownHalfPasses.filter(e => SUCCESS.includes(e.outcome)).length,
    oppHalfPasses: oppHalfPasses.length,
    succOppHalfPasses: oppHalfPasses.filter(e => SUCCESS.includes(e.outcome)).length,

    // shooting
    totalShots: shots.length, shotsOnTarget, goals,
    totalXG: +totalXG.toFixed(2), totalXGOT: +totalXGOT.toFixed(2),
    shots, // raw for shot map

    // defensive
    tackles: tackles.length, succTackles, tackleRegain,
    interceptions: interceptions.length, intRegain,
    blocks: blocks.length,
    clearances: clearances.length,
    saves: saves.length, grippingSaves,
    aerialDuels,
    pressures: pressures.length,
    ballControl,

    // duels won = successful tackles (standing + sliding) + successful dribbles
    duelsWon: succTackles + succDribbles,
    foulsCommitted,

    // ball carrying
    dribbles: dribbles.length, succDribbles,
    dribbleRate: dribbles.length > 0 ? Math.round((succDribbles / dribbles.length) * 100) : 0,
    carries: carries.length, carriesIntoFT, carriesIntoBox,

    // all events for heatmap & maps
    allEvents: events,
    passEvents: passes,
    shotEvents: shots.map((s, i) => ({ ...s, xg: xgValues[i], xgot: xgotValues[i] })),
  }
}

// Normalize a value 0-100 against a max
export function norm(val, max) {
  if (!max) return 0
  return Math.min(100, Math.round((val / max) * 100))
}

export function buildRadarData(playerStats, allStats) {
  const maxDef = Math.max(...allStats.map(s => s.tackles + s.interceptions + s.blocks + s.clearances), 1)
  const maxXG = Math.max(...allStats.map(s => s.totalXG), 0.05)
  const maxCarry = Math.max(...allStats.map(s => s.carriesIntoFT + s.succDribbles + s.progPasses), 1)
  const maxPress = Math.max(...allStats.map(s => s.pressures), 1)
  const maxAerial = Math.max(...allStats.map(s => s.aerialDuels), 1)

  return [
    { metric: 'Passing', value: playerStats.passAccuracy },
    { metric: 'Shooting', value: norm(playerStats.totalXG, maxXG) },
    { metric: 'Ball Carry', value: norm(playerStats.carriesIntoFT + playerStats.succDribbles + playerStats.successProgPasses, maxCarry) },
    { metric: 'Defending', value: norm(playerStats.tackles + playerStats.interceptions + playerStats.blocks + playerStats.clearances, maxDef) },
    { metric: 'Pressing', value: norm(playerStats.pressures, maxPress) },
    { metric: 'Aerials', value: norm(playerStats.aerialDuels, maxAerial) },
  ]
}
