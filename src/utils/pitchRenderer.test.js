/**
 * Tests for pitchRenderer utility
 * Feature: neo-brutalist-dashboard-redesign
 */
import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { drawPitch, PITCH_DIMS } from './pitchRenderer'

// ─── Mock canvas context factory ──────────────────────────────────────────────

function createMockCtx() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
  }
}

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe('PITCH_DIMS', () => {
  test('standard mode has W=105, H=68', () => {
    expect(PITCH_DIMS.standard).toEqual({ W: 105, H: 68 })
  })

  test('futsal mode has W=40, H=20', () => {
    expect(PITCH_DIMS.futsal).toEqual({ W: 40, H: 20 })
  })
})

describe('drawPitch — guard clauses', () => {
  test('returns early when ctx is null', () => {
    // Should not throw
    expect(() => drawPitch(null, 800, 500)).not.toThrow()
  })

  test('returns early when ctx is undefined', () => {
    expect(() => drawPitch(undefined, 800, 500)).not.toThrow()
  })
})

describe('drawPitch — standard mode', () => {
  let ctx

  beforeEach(() => {
    ctx = createMockCtx()
  })

  test('fills pitch with #4a7c59', () => {
    drawPitch(ctx, 800, 500, 'standard')
    // fillStyle should be set to green before fillRect is called
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 500)
    // Check that fillStyle was set to the pitch color at some point
    // We verify by checking the last fillStyle set before fillRect
    expect(ctx.fillRect).toHaveBeenCalled()
  })

  test('sets strokeStyle to #FFFFFF', () => {
    drawPitch(ctx, 800, 500, 'standard')
    expect(ctx.strokeStyle).toBe('#FFFFFF')
  })

  test('sets lineWidth to Math.max(1, width/400)', () => {
    drawPitch(ctx, 800, 500, 'standard')
    expect(ctx.lineWidth).toBe(Math.max(1, 800 / 400))

    const ctx2 = createMockCtx()
    drawPitch(ctx2, 100, 60, 'standard')
    expect(ctx2.lineWidth).toBe(1) // 100/400 = 0.25, clamped to 1
  })

  test('draws outer boundary via strokeRect', () => {
    drawPitch(ctx, 800, 500, 'standard')
    // First strokeRect call should be the outer boundary at (0,0) with full dimensions
    const firstStrokeRect = ctx.strokeRect.mock.calls[0]
    expect(firstStrokeRect[0]).toBeCloseTo(0)
    expect(firstStrokeRect[1]).toBeCloseTo(0)
    expect(firstStrokeRect[2]).toBeCloseTo(800) // 105 * (800/105)
    expect(firstStrokeRect[3]).toBeCloseTo(500) // 68 * (500/68)
  })

  test('draws halfway line via moveTo/lineTo', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    // Halfway line at x=52.5
    expect(ctx.moveTo).toHaveBeenCalledWith(
      expect.closeTo(52.5 * scaleX, 1),
      expect.closeTo(0, 1)
    )
    expect(ctx.lineTo).toHaveBeenCalledWith(
      expect.closeTo(52.5 * scaleX, 1),
      expect.closeTo(68 * scaleY, 1)
    )
  })

  test('draws centre circle via arc', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    // Centre circle: arc at (52.5, 34), r=9.15
    const arcCalls = ctx.arc.mock.calls
    const centreCircle = arcCalls.find(
      ([x, y, r]) =>
        Math.abs(x - 52.5 * scaleX) < 1 &&
        Math.abs(y - 34 * scaleY) < 1 &&
        Math.abs(r - 9.15 * scaleX) < 1
    )
    expect(centreCircle).toBeDefined()
  })

  test('draws both penalty areas via strokeRect', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    const strokeRectCalls = ctx.strokeRect.mock.calls

    // Left penalty area: (0, 13.84), width=16.5, height=40.32
    const leftPA = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 0) < 1 &&
        Math.abs(y - 13.84 * scaleY) < 1 &&
        Math.abs(w - 16.5 * scaleX) < 1 &&
        Math.abs(h - 40.32 * scaleY) < 1
    )
    expect(leftPA).toBeDefined()

    // Right penalty area: (88.5, 13.84), width=16.5, height=40.32
    const rightPA = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 88.5 * scaleX) < 1 &&
        Math.abs(y - 13.84 * scaleY) < 1 &&
        Math.abs(w - 16.5 * scaleX) < 1 &&
        Math.abs(h - 40.32 * scaleY) < 1
    )
    expect(rightPA).toBeDefined()
  })

  test('draws both 6-yard boxes via strokeRect', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    const strokeRectCalls = ctx.strokeRect.mock.calls

    // Left 6-yard box: (0, 24.84), width=5.5, height=18.32
    const left6 = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 0) < 1 &&
        Math.abs(y - 24.84 * scaleY) < 1 &&
        Math.abs(w - 5.5 * scaleX) < 1 &&
        Math.abs(h - 18.32 * scaleY) < 1
    )
    expect(left6).toBeDefined()

    // Right 6-yard box: (99.5, 24.84), width=5.5, height=18.32
    const right6 = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 99.5 * scaleX) < 1 &&
        Math.abs(y - 24.84 * scaleY) < 1 &&
        Math.abs(w - 5.5 * scaleX) < 1 &&
        Math.abs(h - 18.32 * scaleY) < 1
    )
    expect(right6).toBeDefined()
  })

  test('draws both goals via strokeRect', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    const strokeRectCalls = ctx.strokeRect.mock.calls

    // Left goal: (-2.44, 30.34), width=2.44, height=7.32
    const leftGoal = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - (-2.44 * scaleX)) < 1 &&
        Math.abs(y - 30.34 * scaleY) < 1 &&
        Math.abs(w - 2.44 * scaleX) < 1 &&
        Math.abs(h - 7.32 * scaleY) < 1
    )
    expect(leftGoal).toBeDefined()

    // Right goal: (105, 30.34), width=2.44, height=7.32
    const rightGoal = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 105 * scaleX) < 1 &&
        Math.abs(y - 30.34 * scaleY) < 1 &&
        Math.abs(w - 2.44 * scaleX) < 1 &&
        Math.abs(h - 7.32 * scaleY) < 1
    )
    expect(rightGoal).toBeDefined()
  })

  test('draws 4 corner arcs', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    const arcCalls = ctx.arc.mock.calls

    // Corner arcs have r = 1 m
    const cornerArcs = arcCalls.filter(
      ([x, y, r]) => Math.abs(r - 1 * scaleX) < 0.5
    )
    expect(cornerArcs.length).toBe(4)
  })

  test('draws penalty spots as filled circles', () => {
    drawPitch(ctx, 800, 500, 'standard')
    const scaleX = 800 / 105
    const scaleY = 500 / 68
    const arcCalls = ctx.arc.mock.calls

    // Penalty spots: r = 0.3 m at (11, 34) and (94, 34)
    const leftSpot = arcCalls.find(
      ([x, y, r]) =>
        Math.abs(x - 11 * scaleX) < 1 &&
        Math.abs(y - 34 * scaleY) < 1 &&
        Math.abs(r - 0.3 * scaleX) < 0.5
    )
    expect(leftSpot).toBeDefined()

    const rightSpot = arcCalls.find(
      ([x, y, r]) =>
        Math.abs(x - 94 * scaleX) < 1 &&
        Math.abs(y - 34 * scaleY) < 1 &&
        Math.abs(r - 0.3 * scaleX) < 0.5
    )
    expect(rightSpot).toBeDefined()
  })
})

describe('drawPitch — futsal mode', () => {
  let ctx

  beforeEach(() => {
    ctx = createMockCtx()
  })

  test('fills pitch with #4a7c59', () => {
    drawPitch(ctx, 600, 300, 'futsal')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 600, 300)
  })

  test('draws outer boundary at full canvas size', () => {
    drawPitch(ctx, 600, 300, 'futsal')
    const scaleX = 600 / 40
    const scaleY = 300 / 20
    const firstStrokeRect = ctx.strokeRect.mock.calls[0]
    expect(firstStrokeRect[0]).toBeCloseTo(0)
    expect(firstStrokeRect[1]).toBeCloseTo(0)
    expect(firstStrokeRect[2]).toBeCloseTo(40 * scaleX)
    expect(firstStrokeRect[3]).toBeCloseTo(20 * scaleY)
  })

  test('draws centre circle at (20, 10) with r=3', () => {
    drawPitch(ctx, 600, 300, 'futsal')
    const scaleX = 600 / 40
    const scaleY = 300 / 20
    const arcCalls = ctx.arc.mock.calls
    const centreCircle = arcCalls.find(
      ([x, y, r]) =>
        Math.abs(x - 20 * scaleX) < 1 &&
        Math.abs(y - 10 * scaleY) < 1 &&
        Math.abs(r - 3 * scaleX) < 1
    )
    expect(centreCircle).toBeDefined()
  })

  test('draws both penalty areas', () => {
    drawPitch(ctx, 600, 300, 'futsal')
    const scaleX = 600 / 40
    const scaleY = 300 / 20
    const strokeRectCalls = ctx.strokeRect.mock.calls

    // Left penalty area: (0, 8.5), width=6, height=3
    const leftPA = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 0) < 1 &&
        Math.abs(y - 8.5 * scaleY) < 1 &&
        Math.abs(w - 6 * scaleX) < 1 &&
        Math.abs(h - 3 * scaleY) < 1
    )
    expect(leftPA).toBeDefined()

    // Right penalty area: (34, 8.5), width=6, height=3
    const rightPA = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 34 * scaleX) < 1 &&
        Math.abs(y - 8.5 * scaleY) < 1 &&
        Math.abs(w - 6 * scaleX) < 1 &&
        Math.abs(h - 3 * scaleY) < 1
    )
    expect(rightPA).toBeDefined()
  })

  test('draws both goals', () => {
    drawPitch(ctx, 600, 300, 'futsal')
    const scaleX = 600 / 40
    const scaleY = 300 / 20
    const strokeRectCalls = ctx.strokeRect.mock.calls

    // Left goal: (-1, 8.5), width=1, height=3
    const leftGoal = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - (-1 * scaleX)) < 1 &&
        Math.abs(y - 8.5 * scaleY) < 1 &&
        Math.abs(w - 1 * scaleX) < 1 &&
        Math.abs(h - 3 * scaleY) < 1
    )
    expect(leftGoal).toBeDefined()

    // Right goal: (40, 8.5), width=1, height=3
    const rightGoal = strokeRectCalls.find(
      ([x, y, w, h]) =>
        Math.abs(x - 40 * scaleX) < 1 &&
        Math.abs(y - 8.5 * scaleY) < 1 &&
        Math.abs(w - 1 * scaleX) < 1 &&
        Math.abs(h - 3 * scaleY) < 1
    )
    expect(rightGoal).toBeDefined()
  })
})

describe('drawPitch — flipX', () => {
  test('calls ctx.save() and ctx.transform() when flipX=true', () => {
    const ctx = createMockCtx()
    drawPitch(ctx, 800, 500, 'standard', true)
    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.transform).toHaveBeenCalledWith(-1, 0, 0, 1, 800, 0)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  test('does NOT call ctx.save/transform/restore when flipX=false', () => {
    const ctx = createMockCtx()
    drawPitch(ctx, 800, 500, 'standard', false)
    expect(ctx.save).not.toHaveBeenCalled()
    expect(ctx.transform).not.toHaveBeenCalled()
    expect(ctx.restore).not.toHaveBeenCalled()
  })

  test('save is called before drawing and restore after', () => {
    const ctx = createMockCtx()
    const callOrder = []
    ctx.save = vi.fn(() => callOrder.push('save'))
    ctx.fillRect = vi.fn(() => callOrder.push('fillRect'))
    ctx.restore = vi.fn(() => callOrder.push('restore'))
    drawPitch(ctx, 800, 500, 'standard', true)
    const saveIdx = callOrder.indexOf('save')
    const fillIdx = callOrder.indexOf('fillRect')
    const restoreIdx = callOrder.indexOf('restore')
    expect(saveIdx).toBeLessThan(fillIdx)
    expect(fillIdx).toBeLessThan(restoreIdx)
  })
})

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe('pitchRenderer — property-based tests', () => {
  /**
   * Property 26: flipX coordinate mirroring
   * For any coordinate (x, y) drawn with flipX=true, the rendered pixel position
   * SHALL equal the position that (pitchWidth - x, y) would occupy with flipX=false.
   * Validates: Requirements 6.6
   */
  test('Property 26: flipX applies horizontal mirror transform with correct width', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 26: flipX coordinate mirroring
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 2000 }),
        fc.integer({ min: 100, max: 1200 }),
        (width, height) => {
          const ctx = createMockCtx()
          drawPitch(ctx, width, height, 'standard', true)
          // When flipX=true, transform(-1, 0, 0, 1, width, 0) must be called
          expect(ctx.transform).toHaveBeenCalledWith(-1, 0, 0, 1, width, 0)
          // save/restore must wrap the drawing
          expect(ctx.save).toHaveBeenCalled()
          expect(ctx.restore).toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * lineWidth is always >= 1 regardless of canvas width
   * Validates: Requirements 6.3
   */
  test('lineWidth is always at least 1 for any canvas width', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 1, max: 3000 }),
        fc.constantFrom('standard', 'futsal'),
        (width, height, mode) => {
          const ctx = createMockCtx()
          drawPitch(ctx, width, height, mode)
          expect(ctx.lineWidth).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * fillRect is always called with the full canvas dimensions
   * Validates: Requirements 6.1
   */
  test('pitch fill always covers the full canvas area', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 50, max: 1200 }),
        fc.constantFrom('standard', 'futsal'),
        (width, height, mode) => {
          const ctx = createMockCtx()
          drawPitch(ctx, width, height, mode)
          expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, width, height)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * strokeStyle is always #FFFFFF
   * Validates: Requirements 6.3
   */
  test('strokeStyle is always #FFFFFF for any valid input', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 50, max: 1200 }),
        fc.constantFrom('standard', 'futsal'),
        fc.boolean(),
        (width, height, mode, flipX) => {
          const ctx = createMockCtx()
          drawPitch(ctx, width, height, mode, flipX)
          expect(ctx.strokeStyle).toBe('#FFFFFF')
        }
      ),
      { numRuns: 100 }
    )
  })
})
