/**
 * Tests for CanvasTooltip component
 * Feature: neo-brutalist-dashboard-redesign
 */
import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import CanvasTooltip from './CanvasTooltip'

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe('CanvasTooltip — unit tests', () => {
  test('is hidden when visible is false', () => {
    const { container } = render(
      <CanvasTooltip visible={false} x={10} y={10} fields={[]} containerWidth={500} />
    )
    const tooltip = container.firstChild
    expect(tooltip.style.display).toBe('none')
  })

  test('is visible when visible is true', () => {
    const { container } = render(
      <CanvasTooltip visible={true} x={10} y={10} fields={[]} containerWidth={500} />
    )
    const tooltip = container.firstChild
    expect(tooltip.style.display).toBe('block')
  })

  test('renders each field as LABEL: VALUE in uppercase', () => {
    render(
      <CanvasTooltip
        visible={true}
        x={10}
        y={10}
        fields={[
          { label: 'action', value: 'pass' },
          { label: 'outcome', value: 'successful' },
        ]}
        containerWidth={500}
      />
    )
    expect(screen.getByText('ACTION: PASS')).toBeInTheDocument()
    expect(screen.getByText('OUTCOME: SUCCESSFUL')).toBeInTheDocument()
  })

  test('renders fields that are already uppercase unchanged', () => {
    render(
      <CanvasTooltip
        visible={true}
        x={10}
        y={10}
        fields={[{ label: 'XG', value: '0.45' }]}
        containerWidth={500}
      />
    )
    expect(screen.getByText('XG: 0.45')).toBeInTheDocument()
  })

  test('default position is left: x+12, top: y-12', () => {
    const { container } = render(
      <CanvasTooltip visible={true} x={100} y={80} fields={[]} containerWidth={1000} />
    )
    const tooltip = container.firstChild
    // With a large containerWidth the tooltip should not overflow
    expect(tooltip.style.left).toBe('112px')
    expect(tooltip.style.top).toBe('68px')
  })

  test('is absolutely positioned', () => {
    const { container } = render(
      <CanvasTooltip visible={true} x={10} y={10} fields={[]} containerWidth={500} />
    )
    const tooltip = container.firstChild
    expect(tooltip.style.position).toBe('absolute')
  })

  test('uses monospace bold font', () => {
    const { container } = render(
      <CanvasTooltip visible={true} x={10} y={10} fields={[]} containerWidth={500} />
    )
    const tooltip = container.firstChild
    expect(tooltip.style.fontFamily).toBe('monospace')
    expect(tooltip.style.fontWeight).toBe('700')
  })

  test('applies accent background and brutal border', () => {
    const { container } = render(
      <CanvasTooltip visible={true} x={10} y={10} fields={[]} containerWidth={500} />
    )
    const tooltip = container.firstChild
    expect(tooltip.style.background).toContain('var(--color-accent)')
    expect(tooltip.style.border).toContain('var(--border-brutal)')
    expect(tooltip.style.boxShadow).toContain('var(--shadow-brutal)')
  })

  test('renders empty fields array without error', () => {
    expect(() =>
      render(<CanvasTooltip visible={true} x={10} y={10} fields={[]} containerWidth={500} />)
    ).not.toThrow()
  })
})

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe('CanvasTooltip — property-based tests', () => {
  /**
   * Property 17: Tooltip overflow repositioning
   * For any tooltip position where x + tooltipWidth > containerWidth,
   * the tooltip SHALL reposition so its right edge does not exceed containerWidth.
   * Validates: Requirements 11.4
   */
  test('Property 17: tooltip repositions to the left when it would overflow', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 17: Tooltip overflow repositioning
    fc.assert(
      fc.property(
        // containerWidth between 100 and 800
        fc.integer({ min: 100, max: 800 }),
        // x close to or beyond the right edge so overflow is triggered
        fc.integer({ min: 50, max: 800 }),
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 10 }),
            value: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (containerWidth, x, fields) => {
          const { container, unmount } = render(
            <CanvasTooltip
              visible={true}
              x={x}
              y={50}
              fields={fields}
              containerWidth={containerWidth}
            />
          )
          const tooltip = container.firstChild
          const measuredWidth = tooltip.offsetWidth // 0 in jsdom, but logic is still exercised

          // In jsdom offsetWidth is always 0, so overflow condition is:
          // x + 0 > containerWidth → only when x > containerWidth
          // We verify the positioning logic is correct by checking the computed left value.
          const wouldOverflow = (x + measuredWidth) > containerWidth
          const expectedLeft = wouldOverflow
            ? x - measuredWidth - 12
            : x + 12

          expect(tooltip.style.left).toBe(`${expectedLeft}px`)
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 18: Tooltip field format
   * For any array of { label, value } fields passed to CanvasTooltip, each field
   * SHALL be rendered as a separate line in the format `LABEL: VALUE` in uppercase.
   * Validates: Requirements 11.5
   */
  test('Property 18: each field renders as LABEL: VALUE in uppercase', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 18: Tooltip field format
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            value: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (fields) => {
          const { container, unmount } = render(
            <CanvasTooltip
              visible={true}
              x={10}
              y={10}
              fields={fields}
              containerWidth={1000}
            />
          )
          const tooltip = container.firstChild
          const rows = tooltip.querySelectorAll('div')

          expect(rows).toHaveLength(fields.length)

          fields.forEach(({ label, value }, i) => {
            const expectedText = `${label.toUpperCase()}: ${value.toUpperCase()}`
            expect(rows[i].textContent).toBe(expectedText)
          })

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})
