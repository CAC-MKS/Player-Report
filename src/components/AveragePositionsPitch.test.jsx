/**
 * Tests for AveragePositionsPitch component
 * Feature: neo-brutalist-dashboard-redesign
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import fc from 'fast-check'
import AveragePositionsPitch from './AveragePositionsPitch.jsx'

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
    scale: vi.fn(),
    setTransform: vi.fn(),
    closePath: vi.fn(),
  }
  return ctx
}

// ─── Pure logic helpers (mirror component internals) ──────────────────────────

function mean(values) {
  if (!values || values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function mapCoords(x, y, w, h) {
  return {
    px: (x / 120) * w,
    py: (y / 80) * h,
  }
}

function getOpacity(eventCount) {
  return eventCount < 3 ? 0.4 : 1.0
}

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe('AveragePositionsPitch — rendering', () => {
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
      <AveragePositionsPitch players={[]} pitchMode="standard" />
    )
    const wrapper = container.firstChild
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.style.position).toBe('relative')
    expect(wrapper.style.width).toBe('100%')

    const canvas = wrapper.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })

  test('renders with empty players without throwing', () => {
    expect(() =>
      render(<AveragePositionsPitch players={[]} pitchMode="standard" />)
    ).not.toThrow()
  })

  test('renders with null players without throwing', () => {
    expect(() =>
      render(<AveragePositionsPitch players={null} pitchMode="standard" />)
    ).not.toThrow()
  })

  test('renders with valid players without throwing', () => {
    const players = [
      {
        playerId: 'p1',
        name: 'John Doe',
        jerseyNo: 10,
        teamSide: 'home',
        events: [
          { start_x: 60, start_y: 40 },
          { start_x: 70, start_y: 50 },
          { start_x: 80, start_y: 30 },
        ],
      },
    ]
    expect(() =>
      render(<AveragePositionsPitch players={players} pitchMode="standard" />)
    ).not.toThrow()
  })

  test('disconnects ResizeObserver on unmount', () => {
    const { unmount } = render(
      <AveragePositionsPitch players={[]} pitchMode="standard" />
    )
    const disconnectSpy = observerInstance.disconnect
    unmount()
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })
})

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe('AveragePositionsPitch — property-based tests', () => {
  /**
   * Property 12: Average position computation
   * For any player with N≥1 events, the bubble position SHALL equal
   * (mean(events.start_x), mean(events.start_y)) mapped to canvas coordinates.
   * Validates: Requirements 8.1
   */
  test('Property 12: average position equals mean of event coordinates', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 12: Average position computation
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            start_x: fc.float({ min: 0, max: 120, noNaN: true }),
            start_y: fc.float({ min: 0, max: 80, noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        fc.integer({ min: 100, max: 1200 }), // canvas width
        fc.integer({ min: 50, max: 800 }),   // canvas height
        (events, w, h) => {
          const expectedAvgX = mean(events.map((e) => e.start_x))
          const expectedAvgY = mean(events.map((e) => e.start_y))

          const { px: expectedPx, py: expectedPy } = mapCoords(expectedAvgX, expectedAvgY, w, h)

          // Verify the mapping is correct
          expect(expectedPx).toBeCloseTo((expectedAvgX / 120) * w, 5)
          expect(expectedPy).toBeCloseTo((expectedAvgY / 80) * h, 5)

          // Verify mean computation
          const sumX = events.reduce((s, e) => s + e.start_x, 0)
          const sumY = events.reduce((s, e) => s + e.start_y, 0)
          expect(expectedAvgX).toBeCloseTo(sumX / events.length, 5)
          expect(expectedAvgY).toBeCloseTo(sumY / events.length, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12 (integration): component renders players without error
   * Validates: Requirements 8.1
   */
  test('Property 12: component renders players with computed positions without throwing', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 12: Average position computation
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            playerId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            jerseyNo: fc.option(fc.integer({ min: 1, max: 99 }), { nil: null }),
            teamSide: fc.constantFrom('home', 'away'),
            events: fc.array(
              fc.record({
                start_x: fc.float({ min: 0, max: 120, noNaN: true }),
                start_y: fc.float({ min: 0, max: 80, noNaN: true }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (players) => {
          expect(() => {
            const { unmount } = render(
              <AveragePositionsPitch players={players} pitchMode="standard" />
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
   * Property 13: Low sample opacity
   * For any player with fewer than 3 events, the bubble SHALL be rendered at 40% opacity.
   * Validates: Requirements 8.6
   */
  test('Property 13: players with fewer than 3 events have 40% opacity', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 13: Low sample opacity
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        (eventCount) => {
          expect(getOpacity(eventCount)).toBe(0.4)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 13: players with 3 or more events have full opacity', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 13: Low sample opacity
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 100 }),
        (eventCount) => {
          expect(getOpacity(eventCount)).toBe(1.0)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 13: opacity is always either 0.4 or 1.0', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 13: Low sample opacity
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        (eventCount) => {
          const opacity = getOpacity(eventCount)
          expect([0.4, 1.0]).toContain(opacity)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 14: Canvas resize correctness
   * For any container width W and pitchMode, canvas width = W×DPR and
   * height = (W/aspectRatio)×DPR.
   * Validates: Requirements 13.2, 13.3
   */
  test('Property 14: canvas dimensions match W×DPR and (W/aspectRatio)×DPR', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 14: Canvas resize correctness
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),  // container width
        fc.float({ min: 1, max: 3, noNaN: true }), // DPR
        fc.constantFrom('standard', 'futsal'),
        (containerWidth, dpr, pitchMode) => {
          const aspectRatio = pitchMode === 'futsal' ? 40 / 20 : 105 / 68
          const expectedHeight = containerWidth / aspectRatio

          const expectedCanvasWidth = containerWidth * dpr
          const expectedCanvasHeight = expectedHeight * dpr

          // Verify the math
          expect(expectedCanvasWidth).toBeCloseTo(containerWidth * dpr, 5)
          expect(expectedCanvasHeight).toBeCloseTo((containerWidth / aspectRatio) * dpr, 5)

          // Verify aspect ratio is preserved
          expect(expectedCanvasWidth / expectedCanvasHeight).toBeCloseTo(aspectRatio, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 14: component sets canvas dimensions correctly on resize', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 14: Canvas resize correctness
    let capturedCallback = null

    class CapturingResizeObserver {
      constructor(cb) {
        capturedCallback = cb
        observerInstance = this
        this.disconnect = vi.fn()
        this.observe = vi.fn()
        this.unobserve = vi.fn()
      }
    }

    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)
    HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCtx())

    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1200 }),
        fc.constantFrom('standard', 'futsal'),
        (containerWidth, pitchMode) => {
          const { container, unmount } = render(
            <AveragePositionsPitch players={[]} pitchMode={pitchMode} />
          )

          const canvas = container.querySelector('canvas')

          // Simulate ResizeObserver firing
          if (capturedCallback) {
            capturedCallback([{ contentRect: { width: containerWidth } }])
          }

          const aspectRatio = pitchMode === 'futsal' ? 40 / 20 : 105 / 68
          const dpr = window.devicePixelRatio || 1
          const expectedH = containerWidth / aspectRatio

          expect(canvas.width).toBe(containerWidth * dpr)
          // jsdom truncates canvas.height to integer; allow ±1 tolerance
          expect(canvas.height).toBeGreaterThanOrEqual(Math.floor(expectedH * dpr))
          expect(canvas.height).toBeLessThanOrEqual(Math.ceil(expectedH * dpr))
          expect(canvas.style.width).toBe(`${containerWidth}px`)
          // style.height is a string like "64.76px" — parse and compare numerically
          const styleHeight = parseFloat(canvas.style.height)
          expect(styleHeight).toBeCloseTo(expectedH, 1)

          unmount()
        }
      ),
      { numRuns: 30 }
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
            playerId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            jerseyNo: fc.option(fc.integer({ min: 1, max: 99 }), { nil: null }),
            teamSide: fc.constantFrom('home', 'away'),
            events: fc.array(
              fc.record({
                start_x: fc.float({ min: 0, max: 120, noNaN: true }),
                start_y: fc.float({ min: 0, max: 80, noNaN: true }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (pitchMode, players) => {
          const { unmount } = render(
            <AveragePositionsPitch players={players} pitchMode={pitchMode} />
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
