# Design Document: Neo-Brutalist Dashboard Redesign

## Overview

This document describes the technical design for redesigning the CAC Player Match Report dashboard with a Neo-Brutalist visual aesthetic and replacing the existing SVG-based pitch visualizations with four HTML5 Canvas pitch components.

The existing Supabase data layer (`useMatchData.js`, `stats.js`, `xg.js`) and PDF export functionality are preserved unchanged. The redesign is purely additive at the data layer — all changes are in the presentation layer.

**Key design decisions:**
- CSS custom properties drive the entire design system; no CSS-in-JS library is introduced
- Canvas pitch components replace SVG pitches for better performance and richer interactivity
- A shared `drawPitch` utility eliminates duplication across four canvas components
- `ResizeObserver` handles responsive canvas sizing without polling
- `localStorage` persists PitchMode across sessions
- `html2canvas` + `jsPDF` (already installed) handle PDF export

---

## Architecture

```
App.jsx
├── Sidebar (inline component)
│   └── PlayerRow (inline component)
├── TopBar (inline component)
│   └── BrutalistButton (PDF download, PitchMode toggle)
└── PlayerReport.jsx
    ├── BrutalistCard (header, stat tiles, chart wrappers, pitch wrappers)
    ├── BrutalistButton
    ├── StatsGrid.jsx (unchanged)
    ├── HeatMap.jsx (unchanged, wrapped in BrutalistCard)
    ├── RadarChart.jsx (unchanged, wrapped in BrutalistCard)
    ├── FutsalDistributionPitch.jsx  ← new
    ├── AveragePositionsPitch.jsx    ← new
    ├── ShotMapPitch.jsx             ← new
    └── ShotPlacementPitch.jsx       ← new

src/
├── components/
│   ├── BrutalistCard.jsx            ← new
│   ├── BrutalistButton.jsx          ← new
│   ├── CanvasTooltip.jsx            ← new
│   ├── FutsalDistributionPitch.jsx  ← new
│   ├── AveragePositionsPitch.jsx    ← new
│   ├── ShotMapPitch.jsx             ← new
│   ├── ShotPlacementPitch.jsx       ← new
│   ├── HeatMap.jsx                  (unchanged)
│   ├── PassMap.jsx                  (unchanged — kept for reference)
│   ├── Pitch.jsx                    (unchanged — kept for reference)
│   ├── PlayerReport.jsx             ← rewritten
│   ├── RadarChart.jsx               (unchanged)
│   └── StatsGrid.jsx                (unchanged)
└── utils/
    ├── pitchRenderer.js             ← new
    ├── stats.js                     (unchanged)
    └── xg.js                        (unchanged)
```

**State management** lives entirely in `App.jsx` via `useState`:
- `selectedPlayerId` — which player is active
- `pitchMode` — `'standard'` | `'futsal'`, initialised from `localStorage`
- `downloading` — PDF generation in progress
- `pdfError` — error string, auto-cleared after 4 s

`pitchMode` is passed as a prop down to `PlayerReport` → each canvas pitch component.

---

## Components and Interfaces

### `BrutalistCard`

```jsx
<BrutalistCard
  title="PASSING"          // optional string — rendered as uppercase header
  accentColor="#0077B6"    // optional — adds 4px left border in this color
  padding={16}             // optional number, default 16
>
  {children}
</BrutalistCard>
```

Renders a `<div>` with `border: var(--border-brutal)`, `box-shadow: var(--shadow-brutal)`, `background: var(--color-white)`. When `title` is provided, renders it in a `<div>` with `font-weight: 700`, `text-transform: uppercase`, `font-family: monospace` above the children. When `accentColor` is provided, adds `border-left: 4px solid {accentColor}`.

### `BrutalistButton`

```jsx
<BrutalistButton
  onClick={handler}
  variant="primary"   // 'primary' (yellow) | 'danger' (red, white text)
  disabled={false}
>
  DOWNLOAD PDF
</BrutalistButton>
```

Renders a `<button>` with `border: var(--border-brutal-thick)`, `box-shadow: var(--shadow-brutal)`, `font-weight: 700`. Press animation via CSS `:active` pseudo-class: `transform: translate(3px, 3px)` and `box-shadow: 3px 3px 0px 0px #000000`. Disabled state: `opacity: 0.4`, `cursor: not-allowed`.

### `CanvasTooltip`

```jsx
<CanvasTooltip
  visible={true}
  x={240}           // cursor X relative to container
  y={180}           // cursor Y relative to container
  fields={[         // array of { label, value } pairs
    { label: 'ACTION', value: 'Pass' },
    { label: 'OUTCOME', value: 'Successful' },
  ]}
  containerWidth={600}  // used for overflow detection
/>
```

Absolutely positioned `<div>` inside the canvas container. Positioned at `(x + 12, y - 12)`. When `x + tooltipWidth > containerWidth`, repositions to `(x - tooltipWidth - 12, y - 12)`. Renders each field as `LABEL: VALUE` on a separate line. Hidden when `visible` is false.

### `pitchRenderer.js` — `drawPitch(ctx, width, height, mode, flipX)`

Pure function. No React dependency. Called by all four canvas components before drawing overlays.

```js
// Pitch dimensions by mode
const PITCH_DIMS = {
  standard: { W: 105, H: 68 },
  futsal:   { W: 40,  H: 20 },
}

export function drawPitch(ctx, width, height, mode = 'standard', flipX = false)
```

Internally computes `scaleX = width / W` and `scaleY = height / H`. All markings are drawn in pitch-space coordinates then scaled. When `flipX` is true, applies `ctx.transform(-1, 0, 0, 1, width, 0)` before drawing so the coordinate system is mirrored.

**Standard mode markings** (FIFA-compliant, 105×68 m):
- Outer boundary, halfway line
- Centre circle (r = 9.15 m), centre spot
- Both penalty areas (16.5×40.32 m), both 6-yard boxes (5.5×18.32 m)
- Both penalty spots (11 m from goal line)
- Penalty arcs (r = 9.15 m, outside penalty area)
- Both goals (7.32×2.44 m, drawn as open rectangles)
- Corner arcs (r = 1 m)

**Futsal mode markings** (40×20 m):
- Outer boundary, halfway line
- Centre circle (r = 3 m), centre spot
- Both penalty areas (6×3 m), no arc
- Both penalty spots (6 m from goal line)
- Both goals (3×2 m)

Pitch fill: `#4a7c59`. Line color: `#FFFFFF`. Stroke width: `Math.max(1, width / 400)` px.

### Canvas Pitch Components — shared pattern

All four canvas components follow the same hook pattern:

```jsx
const containerRef = useRef(null)
const canvasRef = useRef(null)

useEffect(() => {
  const observer = new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width
    const aspectRatio = pitchMode === 'futsal' ? 40/20 : 105/68
    const h = w / aspectRatio
    const dpr = window.devicePixelRatio || 1
    const canvas = canvasRef.current
    canvas.width  = w * dpr
    canvas.height = h * dpr
    canvas.style.width  = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    draw(ctx, w, h)  // component-specific draw function
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [pitchMode, data])
```

Hit-testing for hover uses `mousemove` on the canvas element. Each component maintains a `hitRegions` ref — an array of `{ bounds, data }` objects populated during `draw()`. On `mousemove`, the handler iterates `hitRegions` to find the nearest point within 8px.

### `FutsalDistributionPitch`

```jsx
<FutsalDistributionPitch
  events={stats.passEvents}   // array of event objects
  pitchMode="standard"
  teamColor="#0077B6"
  playerName="John Doe"
/>
```

Coordinate system: database uses 120×80 (same as existing `Pitch.jsx`). The renderer maps these to canvas pixels: `px = (x / 120) * canvasWidth`, `py = (y / 80) * canvasHeight`.

Draw order per event:
1. `drawPitch(ctx, w, h, pitchMode)`
2. For each event with `end_x != null`: draw line + arrowhead
3. For each event with `end_x == null`: draw circle at `(start_x, start_y)`

Line color logic: outcome in `['Successful', 'Key Pass', 'Assist']` → `#06D6A0`; otherwise `#D90429` at `globalAlpha = 0.5`.

Arrowhead: equilateral triangle, base 6px, pointing in direction of travel, filled in same color as line.

Hit region per event: line segment bounding box expanded by 4px, or circle with r = 6px.

### `AveragePositionsPitch`

```jsx
<AveragePositionsPitch
  players={[
    { playerId, name, jerseyNo, teamSide: 'home'|'away', events: [...] }
  ]}
  pitchMode="standard"
/>
```

Computes `avgX = mean(events.map(e => e.start_x))`, `avgY = mean(events.map(e => e.start_y))` per player. Maps to canvas coordinates using the same 120×80 → pixel scale.

Circle radius: 14px (logical). Opacity: `events.length < 3 ? 0.4 : 1.0`. Color: `teamSide === 'home' ? '#0077B6' : '#D90429'`. Jersey number rendered as white text, `font: bold 10px monospace`, centered.

On hover: radius increases to 21px (×1.5), tooltip shows name, avgX (1 dp), avgY (1 dp), event count.

### `ShotMapPitch`

```jsx
<ShotMapPitch
  shots={stats.shotEvents}   // { start_x, start_y, xg, outcome, player_name, match_time_seconds }
  pitchMode="standard"
/>
```

Canvas is cropped to the attacking half. In standard mode, the viewBox is `x ∈ [52.5, 105]`, `y ∈ [0, 68]`. Achieved by calling `drawPitch` with a translated context: `ctx.translate(-halfWidth, 0)` after scaling, so only the right half is visible.

Radius formula: `r = 4 + (shot.xg / maxXG) * 14` (range 4–18 px).

Goal shots: `globalAlpha = 1.0`, `lineWidth = 3`, `strokeStyle = '#000'`, text `G` centered.
Non-goal shots: `globalAlpha = 0.66`, `lineWidth = 1`, `strokeStyle = '#000'`.

Legend rendered as HTML below the canvas (not on canvas) for PDF compatibility.

### `ShotPlacementPitch`

```jsx
<ShotPlacementPitch
  shots={stats.shotEvents}   // requires goal_y (0–7.32) and goal_z (0–2.44)
/>
```

Goal dimensions: width = 7.32 m, height = 2.44 m. Canvas coordinate mapping:
- `px = padding + (goal_y / 7.32) * (canvasWidth - 2*padding)`
- `py = canvasHeight - padding - (goal_z / 2.44) * (canvasHeight - 2*padding)`

Goal frame drawn with `lineWidth = 4`, `strokeStyle = '#000'`: left post, right post, crossbar, ground line.

Shot circles: r = 8px. Goal → `#06D6A0`, opacity 1.0. Non-goal → `#D90429`, opacity 0.66.

Shots with `null goal_y` or `null goal_z` are filtered out before drawing.

---

## Data Models

### Event object (from Supabase, post-normalisation)

```ts
interface MatchEvent {
  event_id: string
  match_id: string
  player_id: string
  team_id: string
  action: string          // 'Pass', 'Shoot', 'Carry', etc.
  outcome: string         // 'Successful', 'Goal', 'Save', etc.
  start_x: number         // 0–120
  start_y: number         // 0–80
  end_x: number | null
  end_y: number | null
  goal_y: number | null   // 0–7.32, shot placement horizontal
  goal_z: number | null   // 0–2.44, shot placement vertical
  match_time_seconds: number
  team_direction: 'L2R' | 'R2L'
  body_part: string | null
  type: string | null
}
```

### PlayerStats object (from `calcPlayerStats`)

Unchanged from existing `stats.js`. The canvas components consume:
- `stats.passEvents` → `FutsalDistributionPitch`
- `stats.shotEvents` → `ShotMapPitch`, `ShotPlacementPitch`
- `stats.allEvents` → `AveragePositionsPitch` (via `players` prop assembled in `PlayerReport`)

### PitchMode

```ts
type PitchMode = 'standard' | 'futsal'
```

Stored in `localStorage` under key `'pitchMode'`. Default: `'standard'`.

### AveragePositions player shape

```ts
interface AvgPositionPlayer {
  playerId: string
  name: string
  jerseyNo: number | null
  teamSide: 'home' | 'away'
  events: MatchEvent[]
}
```

Assembled in `PlayerReport` from `lineup` and `stats.allEvents`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:** After prework analysis, the following consolidations were made:
- 3.3 and 1.4 are identical (button press animation) — merged into Property 1
- 9.3 and 9.4 (shot circle styling by outcome) — merged into Property 8 (shot outcome color)
- 10.4 and 10.5 (shot placement circle styling) — merged into Property 11 (placement outcome color)
- 5.5 and 5.6 (conditional rendering of pitch cards) — merged into Property 5
- 13.2 and 13.3 (canvas resize behavior) — merged into Property 14

### Property 1: Button press animation

*For any* BrutalistButton, when a pointer-down event is fired, the button's computed transform SHALL be `translate(3px, 3px)` and its box-shadow SHALL be `3px 3px 0px 0px #000000`.

**Validates: Requirements 1.4, 3.3**

### Property 2: BrutalistCard title rendering

*For any* non-empty title string passed to BrutalistCard, the rendered output SHALL contain that string in uppercase within the card header element.

**Validates: Requirements 2.2**

### Property 3: BrutalistCard accent border

*For any* valid CSS color string passed as `accentColor` to BrutalistCard, the rendered element SHALL have a `border-left` style containing that color value.

**Validates: Requirements 2.3**

### Property 4: BrutalistCard children pass-through

*For any* React children passed to BrutalistCard, those children SHALL appear in the rendered output inside the card body.

**Validates: Requirements 2.4**

### Property 5: Conditional pitch card rendering

*For any* player stats object, if `shotEvents.length === 0` then neither ShotMapPitch nor ShotPlacementPitch SHALL be rendered; if `passEvents.length === 0` then FutsalDistributionPitch SHALL not be rendered.

**Validates: Requirements 5.5, 5.6**

### Property 6: PlayerReport header completeness

*For any* player lineup and stats object, the PlayerReport header card SHALL contain the player name, jersey number, position, match name, and match date.

**Validates: Requirements 5.1**

### Property 7: PlayerReport stat tiles

*For any* player stats object, the PlayerReport SHALL render exactly six stat tiles with labels PASSES, PASS%, GOALS, XG, TACKLES, INTERCEPTIONS.

**Validates: Requirements 5.2**

### Property 8: Shot circle outcome styling

*For any* shot event, if `outcome === 'Goal'` the rendered circle SHALL have `globalAlpha = 1.0` and `lineWidth = 3`; otherwise the circle SHALL have `globalAlpha = 0.66` and `lineWidth = 1`.

**Validates: Requirements 9.3, 9.4**

### Property 9: xG radius scaling

*For any* dataset of shots, the circle radius for each shot SHALL be linearly proportional to `shot.xg / maxXG`, clamped to the range [4, 18] px.

**Validates: Requirements 9.2**

### Property 10: Shot placement null guard

*For any* shot event where `goal_y` or `goal_z` is null, ShotPlacementPitch SHALL not draw a circle for that shot and SHALL not throw an error.

**Validates: Requirements 10.7**

### Property 11: Shot placement outcome color

*For any* shot event with valid `goal_y` and `goal_z`, if `outcome === 'Goal'` the circle SHALL be drawn in `#06D6A0` at full opacity; otherwise in `#D90429` at 0.66 opacity.

**Validates: Requirements 10.4, 10.5**

### Property 12: Average position computation

*For any* player with N ≥ 1 events, the rendered bubble position SHALL equal `(mean(events.start_x), mean(events.start_y))` mapped to canvas coordinates.

**Validates: Requirements 8.1**

### Property 13: Low sample opacity

*For any* player with fewer than 3 events, the AveragePositionsPitch bubble SHALL be rendered at 40% opacity.

**Validates: Requirements 8.6**

### Property 14: Canvas resize correctness

*For any* container width W and active PitchMode, after a ResizeObserver callback the canvas `width` attribute SHALL equal `W * devicePixelRatio` and the canvas `height` attribute SHALL equal `(W / aspectRatio) * devicePixelRatio` where `aspectRatio = pitchW / pitchH`.

**Validates: Requirements 13.2, 13.3**

### Property 15: ResizeObserver cleanup

*For any* Canvas_Pitch component, when the component unmounts the ResizeObserver SHALL be disconnected (i.e., `observer.disconnect()` is called).

**Validates: Requirements 13.4**

### Property 16: PitchMode localStorage round-trip

*For any* PitchMode value selected by the user, writing it to `localStorage` and reading it back SHALL return the same value.

**Validates: Requirements 12.5**

### Property 17: Tooltip overflow repositioning

*For any* tooltip position where `x + tooltipWidth > containerWidth`, the tooltip SHALL reposition so its right edge does not exceed `containerWidth`.

**Validates: Requirements 11.4**

### Property 18: Tooltip field format

*For any* array of `{ label, value }` fields passed to CanvasTooltip, each field SHALL be rendered as a separate line in the format `LABEL: VALUE` in uppercase.

**Validates: Requirements 11.5**

### Property 19: Tooltip visibility on hover

*For any* canvas data point, when the cursor moves within 8px of that point the tooltip SHALL become visible; when the cursor leaves the canvas the tooltip SHALL become hidden.

**Validates: Requirements 11.2, 11.3**

### Property 20: FutsalDistributionPitch null end coordinate

*For any* event where `end_x` or `end_y` is null, FutsalDistributionPitch SHALL render only a circle at `(start_x, start_y)` and SHALL not draw an arrowhead.

**Validates: Requirements 7.6**

### Property 21: FutsalDistributionPitch outcome color

*For any* event, if `outcome` is in `['Successful', 'Key Pass', 'Assist']` the line SHALL be drawn in `#06D6A0`; otherwise in `#D90429` at 50% opacity.

**Validates: Requirements 7.3**

### Property 22: PDF error display and auto-clear

*For any* PDF generation failure, the error message SHALL be displayed in red (#D90429) in the top bar and SHALL be automatically cleared after 4 seconds.

**Validates: Requirements 14.4**

### Property 23: BrutalistButton disabled state

*For any* BrutalistButton with `disabled={true}`, the rendered button SHALL have `opacity: 0.4` and `cursor: not-allowed`.

**Validates: Requirements 3.2**

### Property 24: BrutalistButton variant styling

*For any* BrutalistButton with `variant="danger"`, the background SHALL be `#D90429` and the text color SHALL be `#FFFFFF`; with `variant="primary"` the background SHALL be `#FFD166`.

**Validates: Requirements 3.4**

### Property 25: Sidebar NO DATA badge

*For any* player lineup entry where `allStats[player_id]` is undefined or empty, the Sidebar SHALL render a `NO DATA` badge next to that player's name.

**Validates: Requirements 4.4**

### Property 26: flipX coordinate mirroring

*For any* coordinate `(x, y)` drawn with `flipX = true`, the rendered pixel position SHALL equal the position that `(pitchWidth - x, y)` would occupy with `flipX = false`.

**Validates: Requirements 6.6**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Supabase fetch fails | Existing `useMatchData` error state; displayed in sidebar (unchanged) |
| Player has no events | `allStats[playerId]` is undefined; sidebar shows NO DATA badge; PlayerReport not rendered |
| Shot has null `goal_y`/`goal_z` | Filtered before drawing in `ShotPlacementPitch` |
| Event has null `end_x`/`end_y` | `FutsalDistributionPitch` draws circle only, no arrowhead |
| Canvas context unavailable | Guard: `if (!ctx) return` at top of each draw function |
| PDF generation fails | `try/catch` in `downloadPDF`; sets `pdfError` state; auto-cleared after 4 s via `setTimeout` |
| `localStorage` unavailable (SSR/private) | `try/catch` around `localStorage.getItem`; falls back to `'standard'` |
| ResizeObserver not supported | Feature-detect: `if (typeof ResizeObserver === 'undefined') return`; canvas renders at fixed size |

---

## Testing Strategy

### Unit Tests

Use **Vitest** + **@testing-library/react** (standard for Vite/React projects).

Focus areas:
- `BrutalistCard`: title rendering, accentColor border, children pass-through
- `BrutalistButton`: disabled state, variant styling
- `CanvasTooltip`: field format, overflow repositioning
- `pitchRenderer.drawPitch`: called with mock canvas context; verify `fillRect` called with `#4a7c59`, correct number of `strokeRect`/`arc` calls per mode
- `PlayerReport`: conditional rendering of pitch cards (zero shots, zero passes)
- `FutsalDistributionPitch`: null end coordinate guard, outcome color selection
- `ShotPlacementPitch`: null goal_y/goal_z filter
- `AveragePositionsPitch`: average position computation, low-sample opacity

### Property-Based Tests

Use **fast-check** (well-maintained, TypeScript-friendly, works with Vitest).

Install: `npm install --save-dev fast-check`

Each property test runs a minimum of **100 iterations**. Tag format in comments:
`// Feature: neo-brutalist-dashboard-redesign, Property N: <property_text>`

**Property tests to implement:**

| Property | Test description |
|---|---|
| P1 — Button press animation | Generate random button props; simulate pointerdown; assert transform + box-shadow |
| P5 — Conditional pitch rendering | Generate random shot/pass counts; assert correct components rendered/hidden |
| P8 — Shot circle outcome styling | Generate random shot arrays; assert globalAlpha and lineWidth per outcome |
| P9 — xG radius scaling | Generate random xG arrays; assert radius ∈ [4, 18] and linear proportion |
| P10 — Shot placement null guard | Generate shots with arbitrary null goal_y/goal_z; assert no error thrown |
| P12 — Average position computation | Generate random event arrays; assert rendered position equals computed mean |
| P13 — Low sample opacity | Generate players with 0–2 events; assert opacity = 0.4 |
| P14 — Canvas resize correctness | Generate random widths and DPR values; assert canvas dimensions |
| P16 — PitchMode localStorage round-trip | Generate random mode values; write then read; assert equality |
| P17 — Tooltip overflow repositioning | Generate random x positions and container widths; assert no overflow |
| P18 — Tooltip field format | Generate random label/value pairs; assert LABEL: VALUE format |
| P21 — FutsalDistributionPitch outcome color | Generate random events with random outcomes; assert correct color |
| P22 — PDF error auto-clear | Mock failing html2canvas; assert error shown then cleared after 4 s |
| P25 — Sidebar NO DATA badge | Generate lineups with/without stats; assert badge presence |
| P26 — flipX mirroring | Generate random coordinates; assert mirrored pixel position |

**Property test configuration example:**

```js
// Feature: neo-brutalist-dashboard-redesign, Property 9: xG radius scaling
import fc from 'fast-check'

test('xG radius is always in [4, 18] and linearly proportional', () => {
  fc.assert(
    fc.property(
      fc.array(fc.float({ min: 0, max: 1 }), { minLength: 1, maxLength: 20 }),
      (xgValues) => {
        const maxXG = Math.max(...xgValues)
        xgValues.forEach(xg => {
          const r = 4 + (xg / maxXG) * 14
          expect(r).toBeGreaterThanOrEqual(4)
          expect(r).toBeLessThanOrEqual(18)
        })
      }
    ),
    { numRuns: 100 }
  )
})
```

### Integration / Manual Tests

- PDF export: verify canvas content appears in generated PDF (requires browser)
- ResizeObserver: resize browser window; verify all canvases redraw at correct aspect ratio
- PitchMode toggle: switch modes; verify all four canvases redraw with correct markings
- Tooltip: hover over events on each canvas; verify correct data displayed
- High-DPI: test on retina display; verify no blurry canvas rendering
