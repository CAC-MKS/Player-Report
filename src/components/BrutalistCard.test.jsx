/**
 * Tests for BrutalistCard component
 * Feature: neo-brutalist-dashboard-redesign
 */
import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import BrutalistCard from './BrutalistCard'

// ─── Unit Tests ────────────────────────────────────────────────────────────────

describe('BrutalistCard — unit tests', () => {
  test('renders children inside the card body', () => {
    render(<BrutalistCard><span>hello world</span></BrutalistCard>)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  test('renders title header when title prop is provided', () => {
    render(<BrutalistCard title="Passing">content</BrutalistCard>)
    // The header should contain the title text (uppercased via CSS or text)
    expect(screen.getByText('Passing')).toBeInTheDocument()
  })

  test('does not render a header element when title is omitted', () => {
    const { container } = render(<BrutalistCard>content</BrutalistCard>)
    // Only one div child (the body wrapper) inside the card
    const card = container.firstChild
    expect(card.children).toHaveLength(1)
  })

  test('applies default padding of 16 to the body wrapper', () => {
    const { container } = render(<BrutalistCard>content</BrutalistCard>)
    const card = container.firstChild
    const body = card.firstChild
    expect(body).toHaveStyle({ padding: '16px' })
  })

  test('applies custom padding to the body wrapper', () => {
    const { container } = render(<BrutalistCard padding={32}>content</BrutalistCard>)
    const card = container.firstChild
    const body = card.firstChild
    expect(body).toHaveStyle({ padding: '32px' })
  })

  test('applies accentColor as border-left when provided', () => {
    const { container } = render(
      <BrutalistCard accentColor="#0077B6">content</BrutalistCard>
    )
    const card = container.firstChild
    expect(card).toHaveStyle({ borderLeft: '4px solid #0077B6' })
  })

  test('does not apply border-left when accentColor is omitted', () => {
    const { container } = render(<BrutalistCard>content</BrutalistCard>)
    const card = container.firstChild
    // borderLeft should not be set to a 4px solid value
    expect(card.style.borderLeft).toBe('')
  })

  test('applies brutalist border and box-shadow to the card', () => {
    const { container } = render(<BrutalistCard>content</BrutalistCard>)
    const card = container.firstChild
    // CSS custom properties won't resolve in jsdom, but the inline style should reference them
    expect(card.style.border).toContain('var(--border-brutal)')
    expect(card.style.boxShadow).toContain('var(--shadow-brutal)')
  })

  test('applies border-radius 0 to the card', () => {
    const { container } = render(<BrutalistCard>content</BrutalistCard>)
    const card = container.firstChild
    expect(card).toHaveStyle({ borderRadius: '0' })
  })

  test('applies white background to the card', () => {
    const { container } = render(<BrutalistCard>content</BrutalistCard>)
    const card = container.firstChild
    expect(card.style.background).toContain('var(--color-white)')
  })
})

// ─── Property-Based Tests ──────────────────────────────────────────────────────

describe('BrutalistCard — property-based tests', () => {
  /**
   * Property 2: BrutalistCard title rendering
   * For any non-empty title string passed to BrutalistCard, the rendered output
   * SHALL contain that string uppercased in the card header element.
   * Validates: Requirements 2.2
   */
  test('Property 2: title is rendered in the header for any non-empty string', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 2: BrutalistCard title rendering
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (title) => {
          const { container, unmount } = render(
            <BrutalistCard title={title}>body</BrutalistCard>
          )
          const card = container.firstChild
          // With a title, the card should have 2 children: header + body
          expect(card.children).toHaveLength(2)
          const header = card.firstChild
          // The header text content should match the title
          expect(header.textContent).toBe(title)
          // The header should have uppercase text-transform applied via inline style
          expect(header.style.textTransform).toBe('uppercase')
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3: BrutalistCard accent border
   * For any valid CSS color string passed as accentColor to BrutalistCard,
   * the rendered element SHALL have a border-left style containing that color value.
   * Validates: Requirements 2.3
   */
  test('Property 3: accentColor produces border-left containing that color', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 3: BrutalistCard accent border
    // Generate hex colors like #RRGGBB
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 })
        ),
        ([r, g, b]) => {
          const color = `rgb(${r}, ${g}, ${b})`
          const { container, unmount } = render(
            <BrutalistCard accentColor={color}>body</BrutalistCard>
          )
          const card = container.firstChild
          expect(card.style.borderLeft).toContain(color)
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4: BrutalistCard children pass-through
   * For any React children passed to BrutalistCard, those children SHALL appear
   * in the rendered output inside the card body.
   * Validates: Requirements 2.4
   */
  test('Property 4: children are always rendered inside the card body', () => {
    // Feature: neo-brutalist-dashboard-redesign, Property 4: BrutalistCard children pass-through
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (text) => {
          const { container, unmount } = render(
            <BrutalistCard>{text}</BrutalistCard>
          )
          const card = container.firstChild
          // Body is the last child (only child when no title)
          const body = card.lastChild
          expect(body.textContent).toBe(text)
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})
