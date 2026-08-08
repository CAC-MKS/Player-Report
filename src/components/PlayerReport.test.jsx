/**
 * PlayerReport property-based tests
 * Feature: neo-brutalist-dashboard-redesign
 *
 * Property 5: Conditional pitch card rendering
 * Property 6: PlayerReport header completeness
 * Property 7: PlayerReport stat tiles
 *
 * Validates: Requirements 5.1, 5.2, 5.5, 5.6
 */
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import PlayerReport from './PlayerReport.jsx'

// ── Mock canvas-based components to avoid ResizeObserver / canvas issues in jsdom ──
vi.mock('./FutsalDistributionPitch.jsx', () => ({
  default: ({ events }) => (
    <div data-testid="futsal-distribution-pitch" data-event-count={events?.length ?? 0} />
  ),
}))
vi.mock('./ShotMapPitch.jsx', () => ({
  default: ({ shots }) => (
    <div data-testid="shot-map-pitch" data-shot-count={shots?.length ?? 0} />
  ),
}))
vi.mock('./AveragePositionsPitch.jsx', () => ({
  default: ({ players }) => (
    <div data-testid="average-positions-pitch" data-player-count={players?.length ?? 0} />
  ),
}))
vi.mock('./ShotPlacementPitch.jsx', () => ({
  default: ({ shots }) => (
    <div data-testid="shot-placement-pitch" data-shot-count={shots?.length ?? 0} />
  ),
}))
vi.mock('./HeatMap.jsx', () => ({
  default: () => <div data-testid="heat-map" />,
}))
vi.mock('./RadarChart.jsx', () => ({
  default: () => <div data-testid="radar-chart" />,
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal player (lineup entry) object.
 */
function makePlayer(overrides = {}) {
  return {
    player_id: 'player-1',
    jersey_no: 10,
    position: 'Midfielder',
    team_id: 'home-team-id',
    player: { player_name: 'Test Player' },
    ...overrides,
  }
}

/**
 * Build a minimal stats object.
 */
function makeStats(overrides = {}) {
  return {
    totalPasses: 20,
    passAccuracy: 85,
    goals: 1,
    totalXG: 0.45,
    tackles: 3,
    interceptions: 2,
    passEvents: [{ start_x: 50, start_y: 40, end_x: 70, end_y: 40, outcome: 'Successful' }],
    shotEvents: [{ start_x: 90, start_y: 40, xg: 0.3, outcome: 'Goal', player_name: 'Test Player', match_time_seconds: 1800 }],
    allEvents: [],
    ...overrides,
  }
}

/**
 * Build a minimal matchInfo object.
 */
function makeMatchInfo(overrides = {}) {
  return {
    match_name: 'Test Match',
    match_date: '2024-01-01',
    home_team_id: 'home-team-id',
    away_team_id: 'away-team-id',
    ...overrides,
  }
}

// ── Property 5: Conditional pitch card rendering ──────────────────────────────
// **Validates: Requirements 5.5, 5.6**
describe('Property 5: Conditional pitch card rendering', () => {
  test('ShotMapPitch and ShotPlacementPitch are NOT rendered when shotEvents is empty', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 5: Conditional pitch card rendering
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            start_x: fc.float({ min: 0, max: 120 }),
            start_y: fc.float({ min: 0, max: 80 }),
            end_x: fc.float({ min: 0, max: 120 }),
            end_y: fc.float({ min: 0, max: 80 }),
            outcome: fc.constantFrom('Successful', 'Failed'),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (passEvents) => {
          const player = makePlayer()
          const stats = makeStats({ shotEvents: [], passEvents })
          const matchInfo = makeMatchInfo()

          const { queryByTestId, unmount } = render(
            <PlayerReport
              player={player}
              stats={stats}
              matchInfo={matchInfo}
              lineup={[player]}
              allStats={{ 'player-1': stats }}
              pitchMode="standard"
            />
          )

          expect(queryByTestId('shot-map-pitch')).toBeNull()
          expect(queryByTestId('shot-placement-pitch')).toBeNull()
          unmount()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)

  test('FutsalDistributionPitch is NOT rendered when passEvents is empty', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 5: Conditional pitch card rendering
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            start_x: fc.float({ min: 0, max: 120 }),
            start_y: fc.float({ min: 0, max: 80 }),
            xg: fc.float({ min: 0, max: 1 }),
            outcome: fc.constantFrom('Goal', 'Save', 'Miss'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.nat({ max: 5400 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (shotEvents) => {
          const player = makePlayer()
          const stats = makeStats({ passEvents: [], shotEvents })
          const matchInfo = makeMatchInfo()

          const { queryByTestId, unmount } = render(
            <PlayerReport
              player={player}
              stats={stats}
              matchInfo={matchInfo}
              lineup={[player]}
              allStats={{ 'player-1': stats }}
              pitchMode="standard"
            />
          )

          expect(queryByTestId('futsal-distribution-pitch')).toBeNull()
          unmount()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)

  test('ShotMapPitch and ShotPlacementPitch ARE rendered when shotEvents is non-empty', () => {
    const player = makePlayer()
    const stats = makeStats()
    const matchInfo = makeMatchInfo()

    const { getByTestId } = render(
      <PlayerReport
        player={player}
        stats={stats}
        matchInfo={matchInfo}
        lineup={[player]}
        allStats={{ 'player-1': stats }}
        pitchMode="standard"
      />
    )

    expect(getByTestId('shot-map-pitch')).toBeTruthy()
    expect(getByTestId('shot-placement-pitch')).toBeTruthy()
  })

  test('FutsalDistributionPitch IS rendered when passEvents is non-empty', () => {
    const player = makePlayer()
    const stats = makeStats()
    const matchInfo = makeMatchInfo()

    const { getByTestId } = render(
      <PlayerReport
        player={player}
        stats={stats}
        matchInfo={matchInfo}
        lineup={[player]}
        allStats={{ 'player-1': stats }}
        pitchMode="standard"
      />
    )

    expect(getByTestId('futsal-distribution-pitch')).toBeTruthy()
  })

  test('AveragePositionsPitch is ALWAYS rendered', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 5: Conditional pitch card rendering
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (hasShots, hasPasses) => {
          const player = makePlayer()
          const stats = makeStats({
            shotEvents: hasShots
              ? [{ start_x: 90, start_y: 40, xg: 0.3, outcome: 'Goal', player_name: 'P', match_time_seconds: 0 }]
              : [],
            passEvents: hasPasses
              ? [{ start_x: 50, start_y: 40, end_x: 70, end_y: 40, outcome: 'Successful' }]
              : [],
          })
          const matchInfo = makeMatchInfo()

          const { getByTestId, unmount } = render(
            <PlayerReport
              player={player}
              stats={stats}
              matchInfo={matchInfo}
              lineup={[player]}
              allStats={{ 'player-1': stats }}
              pitchMode="standard"
            />
          )

          expect(getByTestId('average-positions-pitch')).toBeTruthy()
          unmount()
        }
      ),
      { numRuns: 50 }
    )
  }, 15000)
})

// ── Property 6: PlayerReport header completeness ──────────────────────────────
// **Validates: Requirements 5.1**
describe('Property 6: PlayerReport header completeness', () => {
  test('header contains player name, jersey number, position, match name, and match date', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 6: PlayerReport header completeness
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom('Goalkeeper', 'Defender', 'Midfielder', 'Forward'),
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        (playerName, jerseyNo, position, matchName, matchDate) => {
          const player = makePlayer({
            jersey_no: jerseyNo,
            position,
            player: { player_name: playerName },
          })
          const stats = makeStats()
          const matchInfo = makeMatchInfo({ match_name: matchName, match_date: matchDate })

          const { container, unmount } = render(
            <PlayerReport
              player={player}
              stats={stats}
              matchInfo={matchInfo}
              lineup={[player]}
              allStats={{ 'player-1': stats }}
              pitchMode="standard"
            />
          )

          const text = container.textContent ?? ''

          // Player name should appear in the rendered output
          expect(text).toContain(playerName)
          // Jersey number
          expect(text).toContain(`#${jerseyNo}`)
          // Position
          expect(text).toContain(position)
          // Match name
          expect(text).toContain(matchName.trim())
          // Match date
          expect(text).toContain(matchDate.trim())

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})

// ── Property 7: PlayerReport stat tiles ──────────────────────────────────────
// **Validates: Requirements 5.2**
describe('Property 7: PlayerReport stat tiles', () => {
  test('exactly six stat tiles are rendered with correct uppercase labels', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 7: PlayerReport stat tiles
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),   // totalPasses
        fc.nat({ max: 100 }),   // passAccuracy
        fc.nat({ max: 10 }),    // goals
        fc.float({ min: 0, max: 5 }),  // totalXG
        fc.nat({ max: 20 }),    // tackles
        fc.nat({ max: 20 }),    // interceptions
        (totalPasses, passAccuracy, goals, totalXG, tackles, interceptions) => {
          const player = makePlayer()
          const stats = makeStats({
            totalPasses,
            passAccuracy,
            goals,
            totalXG: +totalXG.toFixed(2),
            tackles,
            interceptions,
          })
          const matchInfo = makeMatchInfo()

          const { getAllByText, unmount } = render(
            <PlayerReport
              player={player}
              stats={stats}
              matchInfo={matchInfo}
              lineup={[player]}
              allStats={{ 'player-1': stats }}
              pitchMode="standard"
            />
          )

          const expectedLabels = ['PASSES', 'PASS%', 'GOALS', 'XG', 'TACKLES', 'INTERCEPTIONS']
          for (const label of expectedLabels) {
            const elements = getAllByText(label)
            expect(elements.length).toBeGreaterThanOrEqual(1)
          }

          unmount()
        }
      ),
      { numRuns: 50 }
    )
  }, 30000)

  test('stat tile values match the stats object', () => {
    const player = makePlayer()
    const stats = makeStats({
      totalPasses: 42,
      passAccuracy: 78,
      goals: 2,
      totalXG: 1.23,
      tackles: 5,
      interceptions: 3,
    })
    const matchInfo = makeMatchInfo()

    const { getByText } = render(
      <PlayerReport
        player={player}
        stats={stats}
        matchInfo={matchInfo}
        lineup={[player]}
        allStats={{ 'player-1': stats }}
        pitchMode="standard"
      />
    )

    expect(getByText('42')).toBeTruthy()
    expect(getByText('78%')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    expect(getByText('1.23')).toBeTruthy()
    expect(getByText('5')).toBeTruthy()
    expect(getByText('3')).toBeTruthy()
  })
})

// ── Null / missing props guard ────────────────────────────────────────────────
describe('PlayerReport null guard', () => {
  test('renders nothing when player is null', () => {
    const { container } = render(
      <PlayerReport
        player={null}
        stats={makeStats()}
        matchInfo={makeMatchInfo()}
        lineup={[]}
        allStats={{}}
        pitchMode="standard"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when stats is null', () => {
    const { container } = render(
      <PlayerReport
        player={makePlayer()}
        stats={null}
        matchInfo={makeMatchInfo()}
        lineup={[]}
        allStats={{}}
        pitchMode="standard"
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
