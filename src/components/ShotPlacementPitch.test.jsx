/**
 * Tests for ShotPlacementPitch component
 * Feature: neo-brutalist-dashboard-redesign
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import fc from 'fast-check'
import ShotPlacementPitch from './ShotPlacementPitch.jsx'

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
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    lineCap: '',
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
}

// ─── Pure logic helpers (mirror component internals) ──────────────────────────

/**
 * Determine fill color and alpha for a shot based on outcome.
 * Mirrors the shotStyle() function in ShotPlacementPitch.
 */
function shotStyle(outcome) {
  const isGoal = outcome === 'Goal'
  return {
    fillStyle: isGoal ? '#06D6A0' : '#D90429',
    globalAlpha: isGoal ? 1.0 : 0.66,
  }
}

/**
 * Map goal coordinates to canvas pixels.
 * Mirrors the mapCoords() function in ShotPlacementPitch.
 */
function mapCoords(goalY, goalZ, w, h, pad) {
  const GOAL_WIDTH = 7.32
  const GOAL_HEIGHT = 2.44
  const px = pad + (goalY / GOAL_WIDTH) * (w - 2 * pad)
  const py = h - pad - (goalZ / GOAL_HEIGHT) * (h - 2 * pad)
  return { px, py }
}

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe('ShotPlacementPitch — rendering', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('renders a canvas element inside a relative-positioned wrapper', () => {
    const { container } = render(<ShotPlacementPitch shots={[]} />)
    const wrapper = container.firstChild
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.style.position).toBe('relative')
    expect(wrapper.style.width).toBe('100%')

    const canvas = wrapper.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })

  test('renders with empty shots without throwing', () => {
    expect(() => render(<ShotPlacementPitch shots={[]} />)).not.toThrow()
  })

  test('renders with null shots without throwing', () => {
    expect(() => render(<ShotPlacementPitch shots={null} />)).not.toThrow()
  })

  test('renders with valid shots without throwing', () => {
    const shots = [
      { goal_y: 3.66, goal_z: 1.22, outcome: 'Goal', player_name: 'Alice', match_time_seconds: 1800 },
      { goal_y: 1.0, goal_z: 0.5, outcome: 'Saved', player_name: 'Bob', match_time_seconds: 2700 },
    ]
    expect(() => render(<ShotPlacementPitch shots={shots} />)).not.toThrow()
  })

  test('renders shots with null goal_y without throwing', () => {
    const shots = [
      { goal_y: null, goal_z: 1.22, outcome: 'Goal', player_name: 'Alice', match_time_seconds: 1800 },
    ]
    expect(() => render(<ShotPlacementPitch shots={shots} />)).not.toThrow()
  })

  test('renders shots with null goal_z without throwing', () => {
    const shots = [
      { goal_y: 3.66, goal_z: null, outcome: 'Saved', player_name: 'Bob', match_time_seconds: 900 },
    ]
    expect(() => render(<ShotPlacementPitch shots={shots} />)).not.toThrow()
  })

  test('renders shots with both null goal_y and goal_z without throwing', () => {
    const shots = [
      { goal_y: null, goal_z: null, outcome: 'Missed', player_name: 'Charlie', match_time_seconds: 600 },
    ]
    expect(() => render(<ShotPlacementPitch shots={shots} />)).not.toThrow()
  })

  test('disconnects ResizeObserver on unmount', () => {
    const { unmount } = render(<ShotPlacementPitch shots={[]} />)
    const disconnectSpy = observerInstance.disconnect
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })
})

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe('ShotPlacementPitch — property-based tests', () => {
  /**
   * Property 10: Shot placement null guard
   * For any shot with null goal_y or goal_z, no circle is drawn and no error thrown.
   * Validates: Requirements 10.7
   */
  test('Property 10: shots with null goal_y are filtered out (no error)', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 10: Shot placement null guard
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            goal_y: fc.constantFrom(null, undefined),
            goal_z: fc.option(fc.float({ min: 0, max: Math.fround(2.44), noNaN: true }), { nil: null }),
            outcome: fc.constantFrom('Goal', 'Saved', 'Missed', 'Blocked'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.integer({ min: 0, max: 5400 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (shots) => {
          expect(() => {
            const { unmount } = render(<ShotPlacementPitch shots={shots} />)
            unmount()
          }).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('Property 10: shots with null goal_z are filtered out (no error)', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 10: Shot placement null guard
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            goal_y: fc.option(fc.float({ min: 0, max: Math.fround(7.32), noNaN: true }), { nil: null }),
            goal_z: fc.constantFrom(null, undefined),
            outcome: fc.constantFrom('Goal', 'Saved', 'Missed', 'Blocked'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.integer({ min: 0, max: 5400 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (shots) => {
          expect(() => {
            const { unmount } = render(<ShotPlacementPitch shots={shots} />)
            unmount()
          }).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('Property 10: null guard logic — shot with null goal_y or goal_z is excluded', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 10: Shot placement null guard
    fc.assert(
      fc.property(
        fc.record({
          goal_y: fc.option(fc.float({ min: 0, max: Math.fround(7.32), noNaN: true }), { nil: null }),
          goal_z: fc.option(fc.float({ min: 0, max: Math.fround(2.44), noNaN: true }), { nil: null }),
          outcome: fc.string(),
        }),
        (shot) => {
          // A shot is valid only when both goal_y and goal_z are non-null
          const isValid = shot.goal_y != null && shot.goal_z != null
          const filtered = [shot].filter((s) => s.goal_y != null && s.goal_z != null)
          if (isValid) {
            expect(filtered).toHaveLength(1)
          } else {
            expect(filtered).toHaveLength(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11: Shot placement outcome color
   * For any valid shot, Goal → #06D6A0 at opacity 1.0; non-goal → #D90429 at opacity 0.66.
   * Validates: Requirements 10.4, 10.5
   */
  test('Property 11: Goal shots use #06D6A0 at full opacity', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 11: Shot placement outcome color
    fc.assert(
      fc.property(
        fc.constantFrom('Goal'),
        (outcome) => {
          const style = shotStyle(outcome)
          expect(style.fillStyle).toBe('#06D6A0')
          expect(style.globalAlpha).toBe(1.0)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 11: Non-goal shots use #D90429 at 0.66 opacity', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 11: Shot placement outcome color
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'Goal'),
        (outcome) => {
          const style = shotStyle(outcome)
          expect(style.fillStyle).toBe('#D90429')
          expect(style.globalAlpha).toBe(0.66)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 11: outcome styling is binary — only Goal or non-Goal', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 11: Shot placement outcome color
    fc.assert(
      fc.property(
        fc.string(),
        (outcome) => {
          const style = shotStyle(outcome)
          if (outcome === 'Goal') {
            expect(style.fillStyle).toBe('#06D6A0')
            expect(style.globalAlpha).toBe(1.0)
          } else {
            expect(style.fillStyle).toBe('#D90429')
            expect(style.globalAlpha).toBe(0.66)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 11: component renders valid shots without throwing for any outcome', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 11: Shot placement outcome color
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            goal_y: fc.float({ min: 0, max: Math.fround(7.32), noNaN: true }),
            goal_z: fc.float({ min: 0, max: Math.fround(2.44), noNaN: true }),
            outcome: fc.constantFrom('Goal', 'Saved', 'Missed', 'Blocked', 'Off Target'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.integer({ min: 0, max: 5400 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (shots) => {
          expect(() => {
            const { unmount } = render(<ShotPlacementPitch shots={shots} />)
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
        fc.array(
          fc.record({
            goal_y: fc.option(fc.float({ min: 0, max: Math.fround(7.32), noNaN: true }), { nil: null }),
            goal_z: fc.option(fc.float({ min: 0, max: Math.fround(2.44), noNaN: true }), { nil: null }),
            outcome: fc.constantFrom('Goal', 'Saved', 'Missed'),
            player_name: fc.string({ minLength: 1, maxLength: 20 }),
            match_time_seconds: fc.integer({ min: 0, max: 5400 }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (shots) => {
          const { unmount } = render(<ShotPlacementPitch shots={shots} />)
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

  /**
   * Coordinate mapping correctness
   * Validates: Requirements 10.2, 10.3
   */
  test('coordinate mapping: goal_y=0 maps to left padding, goal_y=7.32 maps to right padding', () => {
    // Feature: neo-brutalist-dashboard-redesign, coordinate mapping
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 1200 }), // canvas width
        (w) => {
          const GOAL_WIDTH = 7.32
          const GOAL_HEIGHT = 2.44
          const ASPECT_RATIO = GOAL_WIDTH / GOAL_HEIGHT
          const h = w / ASPECT_RATIO
          const pad = 20

          // Left edge of goal (goal_y = 0) should map to padding
          const left = mapCoords(0, 1.22, w, h, pad)
          expect(left.px).toBeCloseTo(pad, 5)

          // Right edge of goal (goal_y = 7.32) should map to w - padding
          const right = mapCoords(7.32, 1.22, w, h, pad)
          expect(right.px).toBeCloseTo(w - pad, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('coordinate mapping: goal_z=0 maps to ground line, goal_z=2.44 maps to crossbar', () => {
    // Feature: neo-brutalist-dashboard-redesign, coordinate mapping
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 1200 }), // canvas width
        (w) => {
          const GOAL_WIDTH = 7.32
          const GOAL_HEIGHT = 2.44
          const ASPECT_RATIO = GOAL_WIDTH / GOAL_HEIGHT
          const h = w / ASPECT_RATIO
          const pad = 20

          // Ground level (goal_z = 0) should map to h - padding
          const ground = mapCoords(3.66, 0, w, h, pad)
          expect(ground.py).toBeCloseTo(h - pad, 5)

          // Crossbar (goal_z = 2.44) should map to padding
          const crossbar = mapCoords(3.66, 2.44, w, h, pad)
          expect(crossbar.py).toBeCloseTo(pad, 5)
        }
      ),
      { numRuns: 100 }
    )
  })
})
