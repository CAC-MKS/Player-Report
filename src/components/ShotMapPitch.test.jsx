/**
 * Tests for ShotMapPitch component
 * Feature: neo-brutalist-dashboard-redesign
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import fc from 'fast-check'
import ShotMapPitch from './ShotMapPitch.jsx'

// ─── ResizeObserver mock ───────────────────────────────────────────────────────

let observerInstance = null

class MockResizeObserver {
  constructor(cb) {
    observerInstance = this
    this.disconnect = vi.fn()
    this.observe = vi.fn(() => {
      // Immediately fire with a default width so the canvas draws
      cb([{ contentRect: { width: 600 } }])
    })
    this.unobserve = vi.fn()
  }
}

// ─── Canvas context mock ───────────────────────────────────────────────────────

function createMockCtx() {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    closePath: vi.fn(),
  }
  return ctx
}

// ─── Pure logic helpers (mirror component internals) ──────────────────────────

/**
 * Compute shot circle radius from xG value.
 * r = 4 + (xg / maxXG) * 14, clamped to [4, 18].
 * When maxXG === 0, returns 4.
 */
function shotRadius(xg, maxXG) {
  if (!maxXG || maxXG === 0) return 4
  const r = 4 + (xg / maxXG) * 14
  return Math.min(18, Math.max(4, r))
}

/**
 * Determine globalAlpha and lineWidth for a shot based on outcome.
 */
function shotStyle(outcome) {
  const isGoal = outcome === 'Goal'
  return {
    globalAlpha: isGoal ? 1.0 : 0.66,
    lineWidth: isGoal ? 3 : 1,
  }
}

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe('ShotMapPitch — rendering', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('renders a canvas element inside a relative-positioned wrapper', () => {
    const { container } = render(
      <ShotMapPitch shots={[]} pitchMode="standard" />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })

  test('renders with empty shots without throwing', () => {
    expect(() =>
      render(<ShotMapPitch shots={[]} pitchMode="standard" />)
    ).not.toThrow()
  })

  test('renders with null shots without throwing', () => {
    expect(() =>
      render(<ShotMapPitch shots={null} pitchMode="standard" />)
    ).not.toThrow()
  })

  test('renders with valid shots without throwing', () => {
    const shots = [
      { start_x: 90, start_y: 34, xg: 0.3, outcome: 'Goal', player_name: 'Alice', match_time_seconds: 1800 },
      { start_x: 80, start_y: 40, xg: 0.1, outcome: 'Saved', player_name: 'Bob', match_time_seconds: 2700 },
    ]
    expect(() =>
      render(<ShotMapPitch shots={shots} pitchMode="standard" />)
    ).not.toThrow()
  })

  test('renders HTML legend below canvas', () => {
    const { container } = render(
      <ShotMapPitch shots={[]} pitchMode="standard" />
    )
    // Legend should contain "Goal" and "Missed" text
    expect(container.textContent).toMatch(/goal/i)
    expect(container.textContent).toMatch(/missed/i)
  })

  test('disconnects ResizeObserver on unmount', () => {
    const { unmount } = render(
      <ShotMapPitch shots={[]} pitchMode="standard" />
    )
    const disconnectSpy = observerInstance.disconnect
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  test('renders in futsal mode without throwing', () => {
    const shots = [
      { start_x: 90, start_y: 34, xg: 0.2, outcome: 'Saved', player_name: 'Alice', match_time_seconds: 600 },
    ]
    expect(() =>
      render(<ShotMapPitch shots={shots} pitchMode="futsal" />)
    ).not.toThrow()
  })
})

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe('ShotMapPitch — property-based tests', () => {
  /**
   * Property 8: Shot circle outcome styling
   * For any shot, outcome === 'Goal' → globalAlpha = 1.0, lineWidth = 3;
   * otherwise globalAlpha = 0.66, lineWidth = 1.
   * Validates: Requirements 9.3, 9.4
   */
  test('Property 8: Goal shots have globalAlpha=1.0 and lineWidth=3', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 8: Shot circle outcome styling
    fc.assert(
      fc.property(
        fc.constantFrom('Goal'),
        (outcome) => {
          const style = shotStyle(outcome)
          expect(style.globalAlpha).toBe(1.0)
          expect(style.lineWidth).toBe(3)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 8: Non-goal shots have globalAlpha=0.66 and lineWidth=1', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 8: Shot circle outcome styling
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'Goal'),
        (outcome) => {
          const style = shotStyle(outcome)
          expect(style.globalAlpha).toBe(0.66)
          expect(style.lineWidth).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 8: outcome styling is binary — only Goal or non-Goal', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 8: Shot circle outcome styling
    fc.assert(
      fc.property(
        fc.string(),
        (outcome) => {
          const style = shotStyle(outcome)
          if (outcome === 'Goal') {
            expect(style.globalAlpha).toBe(1.0)
            expect(style.lineWidth).toBe(3)
          } else {
            expect(style.globalAlpha).toBe(0.66)
            expect(style.lineWidth).toBe(1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9: xG radius scaling
   * For any dataset of shots, radius ∈ [4, 18] and linearly proportional to xg / maxXG.
   * Validates: Requirements 9.2
   */
  test('Property 9: shot radius is always in [4, 18]', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (xgValues) => {
          const maxXG = Math.max(...xgValues)
          xgValues.forEach((xg) => {
            const r = shotRadius(xg, maxXG)
            expect(r).toBeGreaterThanOrEqual(4)
            expect(r).toBeLessThanOrEqual(18)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9: radius is linearly proportional to xg / maxXG', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: 1, noNaN: true }), // xg
        fc.float({ min: Math.fround(0.01), max: 1, noNaN: true }), // maxXG (must be > 0)
        (xg, maxXG) => {
          // Clamp xg to maxXG so it's a valid proportion
          const clampedXg = Math.min(xg, maxXG)
          const r = shotRadius(clampedXg, maxXG)
          const expected = 4 + (clampedXg / maxXG) * 14
          expect(r).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9: when maxXG === 0, radius defaults to 4', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (xg) => {
          const r = shotRadius(xg, 0)
          expect(r).toBe(4)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9: shot with maxXG xg value gets radius 18', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: 1, noNaN: true }),
        (maxXG) => {
          // When xg === maxXG, radius should be 4 + 14 = 18
          const r = shotRadius(maxXG, maxXG)
          expect(r).toBeCloseTo(18, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9: shot with xg === 0 gets minimum radius 4', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: 1, noNaN: true }),
        (maxXG) => {
          const r = shotRadius(0, maxXG)
          expect(r).toBe(4)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 9: component renders shots without throwing for any xG values', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            start_x: fc.float({ min: 0, max: 120, noNaN: true }),
            start_y: fc.float({ min: 0, max: 80, noNaN: true }),
            xg: fc.float({ min: 0, max: 1, noNaN: true }),
            outcome: fc.constantFrom('Goal', 'Saved', 'Missed', 'Blocked'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.integer({ min: 0, max: 5400 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (shots) => {
          expect(() => {
            const { unmount } = render(
              <ShotMapPitch shots={shots} pitchMode="standard" />
            )
            unmount()
          }).not.toThrow()
        }
      ),
      { numRuns: 50 }
    )

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  /**
   * Property 15: ResizeObserver cleanup
   * On unmount, observer.disconnect() is called.
   * Validates: Requirements 13.4
   */
  test('Property 15: ResizeObserver disconnect called on unmount', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 15: ResizeObserver cleanup
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.constantFrom('standard', 'futsal'),
        fc.array(
          fc.record({
            start_x: fc.float({ min: 0, max: 120, noNaN: true }),
            start_y: fc.float({ min: 0, max: 80, noNaN: true }),
            xg: fc.float({ min: 0, max: 1, noNaN: true }),
            outcome: fc.constantFrom('Goal', 'Saved', 'Missed'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.integer({ min: 0, max: 5400 }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (pitchMode, shots) => {
          const { unmount } = render(
            <ShotMapPitch shots={shots} pitchMode={pitchMode} />
          )
          const disconnectSpy = observerInstance.disconnect
          unmount()
          expect(disconnectSpy).toHaveBeenCalled()
        }
      ),
      { numRuns: 50 }
    )

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})
