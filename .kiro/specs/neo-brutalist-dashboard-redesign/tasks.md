# Implementation Plan: Neo-Brutalist Dashboard Redesign

## Overview

Rewrite the CAC Player Match Report dashboard with a Neo-Brutalist visual system and four new HTML5 Canvas pitch components. The Supabase data layer and PDF export are preserved. All new components are written in React/JSX (Vite project). Property-based tests use fast-check with Vitest.

## Tasks

- [x] 1. Install dependencies and extend CSS design system tokens
  - Run `npm install --save-dev fast-check vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom`
  - Add `test` script to `package.json`: `"test": "vitest --run"`
  - Add `vitest.config.js` (or extend `vite.config.js`) with jsdom environment
  - Replace `src/index.css` with the full Neo-Brutalist token set:
    - `--color-home: #0077B6`, `--color-away: #D90429`, `--color-accent: #FFD166`, `--color-success: #06D6A0`, `--color-black: #000000`, `--color-white: #FFFFFF`
    - `--shadow-brutal: 6px 6px 0px 0px #000000`, `--border-brutal: 2px solid #000000`, `--border-brutal-thick: 4px solid #000000`
    - Global `body` font: monospace; `h1,h2,h3,h4,h5,h6`: `text-transform: uppercase; letter-spacing: 0.05em`
    - Remove all `border-radius` from card/button reset rules
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement BrutalistCard component
  - Create `src/components/BrutalistCard.jsx`
  - Render `<div>` with `border: var(--border-brutal)`, `box-shadow: var(--shadow-brutal)`, `background: var(--color-white)`, `border-radius: 0`
  - Accept `title` prop — render uppercase bold monospace header `<div>` above children when provided
  - Accept `accentColor` prop — add `border-left: 4px solid {accentColor}` when provided
  - Accept `padding` prop (default `16`) — apply as `padding` on the card body wrapper
  - Accept and render `children`
  - [ ]* 2.1 Write property tests for BrutalistCard
    - **Property 2: BrutalistCard title rendering** — for any non-empty title string, rendered output contains that string uppercased in the header
    - **Property 3: BrutalistCard accent border** — for any valid CSS color passed as `accentColor`, rendered element has `border-left` containing that color
    - **Property 4: BrutalistCard children pass-through** — for any React children, they appear inside the card body
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 3. Implement BrutalistButton component
  - Create `src/components/BrutalistButton.jsx`
  - Render `<button>` with `border: var(--border-brutal-thick)`, `box-shadow: var(--shadow-brutal)`, `font-weight: 700`, `border-radius: 0`
  - `variant="primary"` (default): `background: var(--color-accent)`, black text
  - `variant="danger"`: `background: #D90429`, `color: #FFFFFF`
  - CSS `:active` press animation: `transform: translate(3px, 3px)`, `box-shadow: 3px 3px 0px 0px #000000`
  - `disabled` state: `opacity: 0.4`, `cursor: not-allowed`, suppress `:active` transform
  - Accept `onClick`, `disabled`, `variant`, `children` props
  - [ ]* 3.1 Write property tests for BrutalistButton
    - **Property 1: Button press animation** — simulate pointerdown; assert transform and box-shadow values
    - **Property 23: BrutalistButton disabled state** — for any button with `disabled={true}`, opacity is 0.4 and cursor is not-allowed
    - **Property 24: BrutalistButton variant styling** — `variant="danger"` → background `#D90429`, white text; `variant="primary"` → background `#FFD166`
    - **Validates: Requirements 1.4, 3.1, 3.2, 3.3, 3.4**

- [x] 4. Implement CanvasTooltip component
  - Create `src/components/CanvasTooltip.jsx`
  - Render absolutely positioned `<div>` with `background: var(--color-accent)`, `border: var(--border-brutal)`, `box-shadow: var(--shadow-brutal)`, monospace bold text
  - Accept props: `visible` (bool), `x`, `y` (cursor coords relative to container), `fields` (array of `{ label, value }`), `containerWidth`
  - Default position: `left: x + 12`, `top: y - 12`
  - Overflow guard: when `x + tooltipWidth > containerWidth`, reposition to `left: x - tooltipWidth - 12`
  - Render each field as `LABEL: VALUE` on a separate line in uppercase
  - Hidden (`display: none` or `visibility: hidden`) when `visible` is false
  - [ ]* 4.1 Write property tests for CanvasTooltip
    - **Property 17: Tooltip overflow repositioning** — for any x and containerWidth where `x + tooltipWidth > containerWidth`, tooltip right edge does not exceed containerWidth
    - **Property 18: Tooltip field format** — for any array of `{ label, value }` pairs, each renders as `LABEL: VALUE` in uppercase
    - **Validates: Requirements 11.1, 11.4, 11.5**

- [x] 5. Implement pitchRenderer utility
  - Create `src/utils/pitchRenderer.js`
  - Export `drawPitch(ctx, width, height, mode = 'standard', flipX = false)`
  - Define `PITCH_DIMS = { standard: { W: 105, H: 68 }, futsal: { W: 40, H: 20 } }`
  - Compute `scaleX = width / W`, `scaleY = height / H`; apply `flipX` via `ctx.transform(-1, 0, 0, 1, width, 0)` when true
  - Fill pitch with `#4a7c59`; set `strokeStyle = '#FFFFFF'`, `lineWidth = Math.max(1, width / 400)`
  - Standard mode markings: outer boundary, halfway line, centre circle (r=9.15 m), centre spot, both penalty areas (16.5×40.32 m), both 6-yard boxes (5.5×18.32 m), both penalty spots (11 m), penalty arcs (r=9.15 m), both goals (7.32×2.44 m), corner arcs (r=1 m)
  - Futsal mode markings: outer boundary, halfway line, centre circle (r=3 m), centre spot, both penalty areas (6×3 m), both penalty spots (6 m), both goals (3×2 m)
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 12.3, 12.4_

- [x] 6. Implement FutsalDistributionPitch canvas component
  - Create `src/components/FutsalDistributionPitch.jsx`
  - Accept props: `events` (array of MatchEvent), `pitchMode`, `teamColor`, `playerName`
  - Use `containerRef` + `canvasRef` + `ResizeObserver` pattern from design; maintain correct aspect ratio per `pitchMode`; set `canvas.width/height` with `devicePixelRatio` scaling
  - Coordinate mapping: `px = (start_x / 120) * w`, `py = (start_y / 80) * h`
  - Call `drawPitch(ctx, w, h, pitchMode)` first, then overlay events
  - For events with `end_x != null`: draw line + filled arrowhead (equilateral triangle, base 6px) at end point
  - For events with `end_x == null`: draw circle (r=4px) at `(start_x, start_y)` only
  - Outcome color: `['Successful', 'Key Pass', 'Assist']` → `#06D6A0`; otherwise `#D90429` at `globalAlpha = 0.5`
  - Maintain `hitRegions` ref (array of `{ bounds, eventData }`) populated during draw
  - On `mousemove`: find nearest hit region within 8px; highlight hovered path in `#FFD166`; show `<CanvasTooltip>` with action type, timestamp, outcome, player name
  - On `mouseleave`: hide tooltip
  - Disconnect `ResizeObserver` on unmount
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.1, 13.2, 13.3, 13.4_
  - [ ]* 6.1 Write property tests for FutsalDistributionPitch
    - **Property 20: FutsalDistributionPitch null end coordinate** — for any event where `end_x` or `end_y` is null, only a circle is drawn and no arrowhead
    - **Property 21: FutsalDistributionPitch outcome color** — for any event, correct color applied based on outcome membership
    - **Property 15: ResizeObserver cleanup** — on unmount, `observer.disconnect()` is called
    - **Validates: Requirements 7.3, 7.6, 13.4**

- [x] 7. Implement AveragePositionsPitch canvas component
  - Create `src/components/AveragePositionsPitch.jsx`
  - Accept props: `players` (array of `{ playerId, name, jerseyNo, teamSide, events[] }`), `pitchMode`
  - Compute `avgX = mean(events.map(e => e.start_x))`, `avgY = mean(events.map(e => e.start_y))` per player
  - Map to canvas: same 120×80 → pixel scale as FutsalDistributionPitch
  - Circle radius: 14px logical; color: `teamSide === 'home' ? '#0077B6' : '#D90429'`; opacity: `events.length < 3 ? 0.4 : 1.0`
  - Render jersey number as white `bold 10px monospace` text centered in circle
  - On hover: enlarge radius to 21px; show `<CanvasTooltip>` with player name, avgX (1 dp), avgY (1 dp), event count
  - ResizeObserver + DPR scaling + disconnect on unmount
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 13.1, 13.2, 13.3, 13.4_
  - [ ]* 7.1 Write property tests for AveragePositionsPitch
    - **Property 12: Average position computation** — for any player with N≥1 events, bubble position equals `(mean(start_x), mean(start_y))` mapped to canvas coords
    - **Property 13: Low sample opacity** — for any player with fewer than 3 events, bubble rendered at 40% opacity
    - **Property 14: Canvas resize correctness** — for any container width W and pitchMode, canvas width = W×DPR and height = (W/aspectRatio)×DPR
    - **Validates: Requirements 8.1, 8.6, 13.2, 13.3**

- [x] 8. Checkpoint — ensure all tests pass so far
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement ShotMapPitch canvas component
  - Create `src/components/ShotMapPitch.jsx`
  - Accept props: `shots` (array of shot events with `start_x`, `start_y`, `xg`, `outcome`, `player_name`, `match_time_seconds`), `pitchMode`
  - Crop to attacking half: translate context so only `x ∈ [52.5, 105]` (standard) or `x ∈ [20, 40]` (futsal) is visible
  - Radius formula: `r = 4 + (shot.xg / maxXG) * 14` (range 4–18 px); handle `maxXG === 0` guard
  - Goal shots: `globalAlpha = 1.0`, `lineWidth = 3`, `strokeStyle = '#000'`, draw `G` label centered
  - Non-goal shots: `globalAlpha = 0.66`, `lineWidth = 1`, `strokeStyle = '#000'`
  - On hover: show `<CanvasTooltip>` with player name, xG (2 dp), outcome, minute
  - Render HTML legend below canvas (not on canvas): filled circle = Goal, semi-transparent = Missed/Saved, size scale indicator
  - ResizeObserver + DPR scaling + disconnect on unmount
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 13.1, 13.2, 13.3, 13.4_
  - [ ]* 9.1 Write property tests for ShotMapPitch
    - **Property 8: Shot circle outcome styling** — for any shot, `outcome === 'Goal'` → `globalAlpha = 1.0`, `lineWidth = 3`; otherwise `globalAlpha = 0.66`, `lineWidth = 1`
    - **Property 9: xG radius scaling** — for any dataset of shots, radius ∈ [4, 18] and linearly proportional to `xg / maxXG`
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [x] 10. Implement ShotPlacementPitch canvas component
  - Create `src/components/ShotPlacementPitch.jsx`
  - Accept props: `shots` (array with `goal_y`, `goal_z`, `outcome`, `player_name`, `match_time_seconds`)
  - Filter out shots where `goal_y == null || goal_z == null` before drawing
  - Render 2D frontal goalmouth: goal width = 7.32 m, height = 2.44 m; scale to fill canvas with padding
  - Coordinate mapping: `px = padding + (goal_y / 7.32) * (w - 2*padding)`, `py = h - padding - (goal_z / 2.44) * (h - 2*padding)`
  - Draw goal frame: left post, right post, crossbar, ground line — `lineWidth = 4`, `strokeStyle = '#000'`
  - Shot circles r=8px: Goal → `#06D6A0` opacity 1.0; non-goal → `#D90429` opacity 0.66
  - On hover: show `<CanvasTooltip>` with player name, outcome, minute
  - ResizeObserver + DPR scaling + disconnect on unmount (aspect ratio: 7.32/2.44 ≈ 3:1, padded)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 13.1, 13.2, 13.3, 13.4_
  - [ ]* 10.1 Write property tests for ShotPlacementPitch
    - **Property 10: Shot placement null guard** — for any shot with null `goal_y` or `goal_z`, no circle drawn and no error thrown
    - **Property 11: Shot placement outcome color** — for any valid shot, Goal → `#06D6A0` opacity 1.0; non-goal → `#D90429` opacity 0.66
    - **Validates: Requirements 10.4, 10.5, 10.7**

- [x] 11. Rewrite PlayerReport.jsx
  - Rewrite `src/components/PlayerReport.jsx` using `forwardRef`
  - Header: `<BrutalistCard accentColor={teamColor}>` showing player name, jersey number, position, match name, match date — _Requirements: 5.1_
  - Stat tiles: 6-tile grid using `<BrutalistCard>` for Passes, Pass%, Goals, xG, Tackles, Interceptions — _Requirements: 5.2_
  - Two-column grid: HeatMap and RadarChart each wrapped in `<BrutalistCard>` — _Requirements: 5.3_
  - Below grid: `<FutsalDistributionPitch>` in `<BrutalistCard>` — only when `stats.passEvents.length > 0` — _Requirements: 5.4, 5.6_
  - `<ShotMapPitch>` in `<BrutalistCard>` — only when `stats.shotEvents.length > 0` — _Requirements: 5.4, 5.5_
  - `<AveragePositionsPitch>` in `<BrutalistCard>` — assembled `players` prop from `lineup` and `allStats` — _Requirements: 5.4_
  - `<ShotPlacementPitch>` in `<BrutalistCard>` — only when `stats.shotEvents.length > 0` — _Requirements: 5.4, 5.5_
  - Pass `pitchMode` prop down to all canvas pitch components
  - [ ]* 11.1 Write property tests for PlayerReport conditional rendering
    - **Property 5: Conditional pitch card rendering** — for any stats with `shotEvents.length === 0`, ShotMapPitch and ShotPlacementPitch not rendered; `passEvents.length === 0` → FutsalDistributionPitch not rendered
    - **Property 6: PlayerReport header completeness** — for any lineup/stats, header card contains player name, jersey number, position, match name, match date
    - **Property 7: PlayerReport stat tiles** — for any stats object, exactly six stat tiles rendered with correct labels
    - **Validates: Requirements 5.1, 5.2, 5.5, 5.6**

- [x] 12. Rewrite App.jsx shell and sidebar
  - Add `pitchMode` state: `useState(() => { try { return localStorage.getItem('pitchMode') || 'standard' } catch { return 'standard' } })`
  - Add `pdfError` state (string | null); auto-clear via `setTimeout(..., 4000)` on set
  - Sidebar: `background: var(--color-black)`, `border-right: var(--border-brutal-thick)`, fixed width 240px, sticky
  - Sidebar header: match name, date, score in bold uppercase monospace
  - Player rows: selected row → `background: var(--color-home)`, white text; no-data players → red `NO DATA` badge
  - Top sticky bar: `border-bottom: var(--border-brutal-thick)`; `<BrutalistButton>` for PDF download; `<BrutalistButton>` for PitchMode toggle labeled `STANDARD` / `FUTSAL`
  - PitchMode toggle: on click, update state and `localStorage.setItem('pitchMode', newMode)`
  - Empty state: centered football emoji + uppercase `SELECT A PLAYER` text
  - Update `downloadPDF`: wrap in `try/catch`; on failure set `pdfError`; pass `allowTaint: true` to `html2canvas`
  - Pass `pitchMode` prop to `<PlayerReport>`
  - Display `pdfError` in red `#D90429` in top bar when set
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 12.1, 12.2, 12.5, 14.1, 14.2, 14.3, 14.4_
  - [ ]* 12.1 Write property tests for App shell
    - **Property 16: PitchMode localStorage round-trip** — for any PitchMode value, write to localStorage then read back returns same value
    - **Property 22: PDF error display and auto-clear** — mock failing html2canvas; assert error shown in red then cleared after 4 s
    - **Property 25: Sidebar NO DATA badge** — for any lineup entry without stats, sidebar renders `NO DATA` badge
    - **Validates: Requirements 4.4, 12.5, 14.4**

- [x] 13. Checkpoint — run full test suite and verify build
  - Run `npm test` and ensure all non-optional property tests pass
  - Run `npm run build` and confirm no build errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Git push to remote
  - Stage all changes: `git add -A`
  - Commit: `git commit -m "feat: neo-brutalist dashboard redesign with canvas pitch components"`
  - Add remote if not present: `git remote add origin https://github.com/PPrince33/CAC-player-match-report.git`
  - Push: `git push -u origin main`
  - _Note: push to `https://github.com/PPrince33/CAC-player-match-report.git`_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 8 and 13 ensure incremental validation
- Property tests use fast-check with a minimum of 100 iterations per property
- The `pitchRenderer.js` utility is a pure function with no React dependency — test it with a mock canvas context
- `flipX` support in `pitchRenderer` is required for teams attacking right-to-left (Property 26)
- Existing files (`HeatMap.jsx`, `RadarChart.jsx`, `StatsGrid.jsx`, `PassMap.jsx`, `Pitch.jsx`, `useMatchData.js`, `stats.js`, `xg.js`, `supabase.js`) are unchanged
