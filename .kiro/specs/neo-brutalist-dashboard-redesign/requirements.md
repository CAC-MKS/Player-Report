# Requirements Document

## Introduction

This feature redesigns the existing React/Vite football analytics dashboard to adopt a Neo-Brutalist visual aesthetic and replaces the current SVG-based pitch visualizations with four new HTML5 Canvas pitch components. The redesign covers the global design system (colors, typography, shadows, borders), shared UI primitives (BrutalistCard, BrutalistButton), the App shell and sidebar, the PlayerReport layout, and four distinct pitch analytics canvases: Event Scatter Telemetry Map, Tactical Average Positions, xG Shot Map, and Goal Face Shot Placement. The existing Supabase data layer and PDF export functionality are preserved.

## Glossary

- **Dashboard**: The full single-page application rendered by `App.jsx`.
- **Design_System**: The set of CSS custom properties, utility classes, and shared primitives that enforce the Neo-Brutalist aesthetic.
- **BrutalistCard**: A reusable container component with thick black border and hard offset shadow.
- **BrutalistButton**: A reusable interactive element with thick black border, hard offset shadow, and active-press animation.
- **Sidebar**: The fixed left-hand navigation panel listing players and match metadata.
- **PlayerReport**: The main content panel displaying all analytics for a selected player.
- **Canvas_Pitch**: An HTML5 `<canvas>` element that renders a scaled football or futsal pitch and overlaid analytics data.
- **Pitch_Renderer**: The module responsible for drawing pitch markings on a Canvas_Pitch.
- **FutsalDistributionPitch**: The Canvas_Pitch component that plots event start/end coordinates with directional arrows.
- **AveragePositionsPitch**: The Canvas_Pitch component that plots per-player average X/Y positions as colored bubbles.
- **ShotMapPitch**: The Canvas_Pitch component that maps shot locations scaled by xG value.
- **ShotPlacementPitch**: The Canvas_Pitch component that renders a 2D frontal goalmouth view of shot placements.
- **Tooltip**: A yellow Neo-Brutalist overlay panel that appears on canvas hover showing contextual data.
- **PitchMode**: An enumeration of two values — `standard` (105×68 m) and `futsal` (40×20 m) — that controls pitch scale and markings.
- **Home_Team**: The team designated as the home side, rendered in blue (#0077B6).
- **Away_Team**: The team designated as the away side, rendered in red (#D90429).
- **xG**: Expected Goals — a float between 0 and 1 representing shot quality.
- **Pretty_Printer**: A formatting utility that serialises internal data structures back to a canonical string form for debugging and export.

---

## Requirements

### Requirement 1: Neo-Brutalist Design System

**User Story:** As a developer, I want a centralised design system, so that all Neo-Brutalist visual rules are applied consistently across every component.

#### Acceptance Criteria

1. THE Design_System SHALL define CSS custom properties for the following tokens: `--color-home` (#0077B6), `--color-away` (#D90429), `--color-accent` (#FFD166), `--color-success` (#06D6A0), `--color-black` (#000000), `--color-white` (#FFFFFF), `--shadow-brutal` (6px 6px 0px 0px #000000), `--border-brutal` (2px solid #000000), `--border-brutal-thick` (4px solid #000000).
2. THE Design_System SHALL set the global body font to a monospace typeface and apply `text-transform: uppercase` and `letter-spacing: 0.05em` to all heading elements.
3. THE Design_System SHALL remove all `border-radius` values greater than 0px from card and button primitives, enforcing sharp corners.
4. WHEN a BrutalistButton receives a pointer-down event, THE BrutalistButton SHALL translate by (3px, 3px) and reduce its box-shadow offset to (3px, 3px) to simulate a physical press.
5. THE Design_System SHALL apply `--shadow-brutal` as the default `box-shadow` to BrutalistCard and BrutalistButton.

---

### Requirement 2: BrutalistCard Component

**User Story:** As a developer, I want a reusable card container, so that all dashboard panels share the same Neo-Brutalist framing.

#### Acceptance Criteria

1. THE BrutalistCard SHALL render a `<div>` with `border: var(--border-brutal)`, `box-shadow: var(--shadow-brutal)`, and `background: var(--color-white)`.
2. THE BrutalistCard SHALL accept a `title` prop and render it as an uppercase, bold, monospace label above the card body.
3. WHERE an `accentColor` prop is provided, THE BrutalistCard SHALL render a 4px solid left border in that color in addition to the standard black border.
4. THE BrutalistCard SHALL accept `children` and render them inside the card body without imposing additional padding beyond a configurable `padding` prop (default 16px).

---

### Requirement 3: BrutalistButton Component

**User Story:** As a developer, I want a reusable button primitive, so that all interactive controls share the same Neo-Brutalist style and press feedback.

#### Acceptance Criteria

1. THE BrutalistButton SHALL render a `<button>` with `border: var(--border-brutal-thick)`, `box-shadow: var(--shadow-brutal)`, `background: var(--color-accent)`, and `font-weight: 700`.
2. WHEN a BrutalistButton is disabled, THE BrutalistButton SHALL render with 40% opacity and a `not-allowed` cursor.
3. WHEN a BrutalistButton receives a pointer-down event, THE BrutalistButton SHALL apply a CSS transform of `translate(3px, 3px)` and reduce `box-shadow` to `3px 3px 0px 0px #000000`.
4. THE BrutalistButton SHALL accept a `variant` prop with values `primary` (yellow background) and `danger` (red background, white text).

---

### Requirement 4: App Shell and Sidebar Redesign

**User Story:** As an analyst, I want the application shell to reflect the Neo-Brutalist aesthetic, so that the dashboard feels cohesive and visually striking.

#### Acceptance Criteria

1. THE Dashboard SHALL render a sticky left Sidebar with `background: var(--color-black)`, `border-right: var(--border-brutal-thick)`, and a fixed width of 240px.
2. THE Sidebar SHALL display the match name, date, and score in bold uppercase monospace text.
3. WHEN a player row in the Sidebar is selected, THE Sidebar SHALL highlight that row with `background: var(--color-home)` and white text.
4. WHEN a player row in the Sidebar has no associated event data, THE Sidebar SHALL render a `NO DATA` badge in red (#D90429) next to the player name.
5. THE Dashboard SHALL render a top sticky bar above the PlayerReport with a `border-bottom: var(--border-brutal-thick)` and a BrutalistButton for PDF download.
6. THE Dashboard SHALL display a centered empty state with a football emoji and uppercase `SELECT A PLAYER` text when no player is selected.

---

### Requirement 5: PlayerReport Layout Redesign

**User Story:** As an analyst, I want the player report to use Neo-Brutalist cards and typography, so that the data is presented with maximum visual clarity.

#### Acceptance Criteria

1. THE PlayerReport SHALL render a header BrutalistCard with `accentColor` set to the team color, displaying player name, jersey number, position, match name, and match date.
2. THE PlayerReport SHALL render a row of six stat tiles using BrutalistCard, each showing a single numeric value and an uppercase label, for: Passes, Pass%, Goals, xG, Tackles, Interceptions.
3. THE PlayerReport SHALL render the HeatMap and RadarChart side-by-side inside BrutalistCard containers in a two-column grid.
4. THE PlayerReport SHALL render the FutsalDistributionPitch (pass events), ShotMapPitch, AveragePositionsPitch, and ShotPlacementPitch each inside a BrutalistCard, stacked below the two-column grid.
5. WHEN a player has zero shot events, THE PlayerReport SHALL not render the ShotMapPitch or ShotPlacementPitch cards.
6. WHEN a player has zero pass events, THE PlayerReport SHALL not render the FutsalDistributionPitch card.

---

### Requirement 6: Canvas Pitch Renderer

**User Story:** As a developer, I want a shared pitch-drawing utility, so that all four Canvas_Pitch components render consistent, correctly scaled pitch markings.

#### Acceptance Criteria

1. THE Pitch_Renderer SHALL accept a `PitchMode` parameter and draw pitch markings scaled to 105×68 m when mode is `standard` and 40×20 m when mode is `futsal`.
2. THE Pitch_Renderer SHALL draw: outer boundary, halfway line, centre circle, centre spot, both penalty areas, both six-yard boxes, both penalty spots, both goals, and corner arcs.
3. THE Pitch_Renderer SHALL use a pitch fill of `#4a7c59` (dark green) with white (`#FFFFFF`) line markings at a stroke width proportional to canvas scale.
4. WHEN the Canvas_Pitch container is resized, THE Pitch_Renderer SHALL redraw all markings at the new pixel dimensions while preserving the correct aspect ratio for the selected PitchMode.
5. THE Pitch_Renderer SHALL expose a `drawPitch(ctx, width, height, mode)` function that other Canvas_Pitch components call before drawing their own overlays.
6. THE Pitch_Renderer SHALL accept a `flipX` boolean parameter; WHEN `flipX` is true, THE Pitch_Renderer SHALL mirror the coordinate system horizontally so that both teams attack left-to-right.

---

### Requirement 7: Event Scatter Telemetry Map (FutsalDistributionPitch)

**User Story:** As an analyst, I want to see exact start and end coordinates of player actions on the pitch, so that I can understand movement and passing patterns.

#### Acceptance Criteria

1. THE FutsalDistributionPitch SHALL render a Canvas_Pitch and plot each event as a line from `(start_x, start_y)` to `(end_x, end_y)` in the team color.
2. WHEN an event has both `start_x` and `end_x` coordinates, THE FutsalDistributionPitch SHALL draw a filled arrowhead at the `end_x`/`end_y` point indicating direction of travel.
3. WHEN an event `outcome` is in `['Successful', 'Key Pass', 'Assist']`, THE FutsalDistributionPitch SHALL render the line in `--color-success` (#06D6A0); otherwise THE FutsalDistributionPitch SHALL render the line in `--color-away` (#D90429) at 50% opacity.
4. WHEN the user hovers over an event line or arrowhead on the canvas, THE FutsalDistributionPitch SHALL highlight the hovered path in `--color-accent` (#FFD166) and display a Tooltip showing: action type, timestamp, outcome, and player name.
5. THE FutsalDistributionPitch SHALL accept a `pitchMode` prop and pass it to the Pitch_Renderer.
6. WHEN an event has a null `end_x` or null `end_y`, THE FutsalDistributionPitch SHALL render only a circle at `(start_x, start_y)` with no arrowhead.

---

### Requirement 8: Tactical Average Positions (AveragePositionsPitch)

**User Story:** As an analyst, I want to see the average position of each player on the pitch, so that I can understand team shape and tactical structure.

#### Acceptance Criteria

1. THE AveragePositionsPitch SHALL compute each player's average X and average Y from all their events and render a filled circle at that coordinate.
2. THE AveragePositionsPitch SHALL color each circle using `--color-home` for the home team and `--color-away` for the away team.
3. THE AveragePositionsPitch SHALL render the player's jersey number as white text centered inside the circle.
4. WHEN the user hovers over a player bubble, THE AveragePositionsPitch SHALL enlarge the circle radius by 50% and display a Tooltip showing: player name, average X, average Y, and total event count.
5. THE AveragePositionsPitch SHALL accept a `players` prop as an array of objects with shape `{ playerId, name, jerseyNo, teamSide, events[] }`.
6. IF a player has fewer than 3 events, THEN THE AveragePositionsPitch SHALL render the bubble at 40% opacity to indicate low sample size.

---

### Requirement 9: Expected Goals (xG) Shot Map (ShotMapPitch)

**User Story:** As an analyst, I want to see shot locations scaled by xG value, so that I can assess shot quality and attacking threat.

#### Acceptance Criteria

1. THE ShotMapPitch SHALL render a Canvas_Pitch cropped to the attacking half (x ≥ 52.5 m in standard mode) and plot each shot as a circle at `(start_x, start_y)`.
2. THE ShotMapPitch SHALL scale each circle's radius linearly between a minimum of 4px and a maximum of 18px based on the shot's `xg` value relative to the maximum `xg` in the dataset.
3. WHEN a shot `outcome` is `'Goal'`, THE ShotMapPitch SHALL render the circle as fully opaque with a thick black border (3px) and a `G` label.
4. WHEN a shot `outcome` is not `'Goal'`, THE ShotMapPitch SHALL render the circle at 66% opacity (`#AA` hex alpha) with a 1px black border.
5. WHEN the user hovers over a shot circle, THE ShotMapPitch SHALL display a Tooltip showing: player name, xG value (2 decimal places), outcome, and minute.
6. THE ShotMapPitch SHALL render a legend below the canvas showing: filled circle = Goal, semi-transparent circle = Missed/Saved, and a size scale indicator.

---

### Requirement 10: Goal Face Shot Placement (ShotPlacementPitch)

**User Story:** As an analyst, I want to see where shots were aimed on the goal face, so that I can evaluate goalkeeper positioning and finishing accuracy.

#### Acceptance Criteria

1. THE ShotPlacementPitch SHALL render a 2D frontal goalmouth view using Y (horizontal, 0–7.32 m) and Z (vertical, 0–2.44 m) axes scaled to fill the canvas width.
2. THE ShotPlacementPitch SHALL draw the goal frame: two posts, crossbar, and a ground line, using thick black strokes.
3. THE ShotPlacementPitch SHALL plot each shot as a circle at `(goal_y, goal_z)` coordinates where available.
4. WHEN a shot `outcome` is `'Goal'`, THE ShotPlacementPitch SHALL render the circle in `--color-success` (#06D6A0) fully opaque.
5. WHEN a shot `outcome` is not `'Goal'`, THE ShotPlacementPitch SHALL render the circle in `--color-away` (#D90429) at 66% opacity.
6. WHEN the user hovers over a shot circle, THE ShotPlacementPitch SHALL display a Tooltip showing: player name, outcome, and minute.
7. IF a shot record has null `goal_y` or null `goal_z`, THEN THE ShotPlacementPitch SHALL exclude that shot from the goalmouth view without error.

---

### Requirement 11: Neo-Brutalist Canvas Tooltip

**User Story:** As an analyst, I want a consistent hover tooltip on all pitch canvases, so that I can read contextual data without leaving the visualization.

#### Acceptance Criteria

1. THE Tooltip SHALL render as an absolutely positioned `<div>` overlaid on the canvas container, with `background: var(--color-accent)` (#FFD166), `border: var(--border-brutal)`, `box-shadow: var(--shadow-brutal)`, and monospace bold text.
2. WHEN the cursor moves within 8px of a data point on any Canvas_Pitch, THE Tooltip SHALL become visible and position itself 12px to the right and 12px above the cursor.
3. WHEN the cursor leaves the canvas element, THE Tooltip SHALL become hidden.
4. THE Tooltip SHALL never overflow the visible viewport; WHEN the Tooltip would overflow the right edge, THE Tooltip SHALL reposition to the left of the cursor.
5. THE Tooltip SHALL render each data field as a separate line in the format `LABEL: VALUE` in uppercase.

---

### Requirement 12: PitchMode Toggle

**User Story:** As an analyst, I want to toggle between standard football and futsal pitch dimensions, so that I can analyse both match formats correctly.

#### Acceptance Criteria

1. THE Dashboard SHALL render a BrutalistButton labeled `STANDARD` / `FUTSAL` that toggles the global PitchMode state.
2. WHEN PitchMode changes, THE Pitch_Renderer SHALL redraw all active Canvas_Pitch components with the new dimensions and recalculated markings.
3. WHILE PitchMode is `futsal`, THE Pitch_Renderer SHALL draw a 40×20 m pitch with penalty areas scaled proportionally (6×3 m penalty area, no arc).
4. WHILE PitchMode is `standard`, THE Pitch_Renderer SHALL draw a 105×68 m pitch with full FIFA-compliant markings including penalty arcs.
5. THE Dashboard SHALL persist the selected PitchMode in `localStorage` so that it is restored on page reload.

---

### Requirement 13: Responsive Canvas Resizing

**User Story:** As an analyst, I want the pitch canvases to resize correctly when the browser window changes size, so that visualizations remain readable on any screen.

#### Acceptance Criteria

1. THE Canvas_Pitch SHALL use a `ResizeObserver` to detect changes to its container element's width.
2. WHEN the container width changes, THE Canvas_Pitch SHALL update the canvas `width` and `height` attributes to match the new pixel dimensions while maintaining the correct aspect ratio for the active PitchMode.
3. THE Canvas_Pitch SHALL set `canvas.width` and `canvas.height` to the container's `devicePixelRatio`-scaled dimensions to prevent blurry rendering on high-DPI displays.
4. WHEN the Canvas_Pitch component unmounts, THE Canvas_Pitch SHALL disconnect the ResizeObserver to prevent memory leaks.

---

### Requirement 14: PDF Export Compatibility

**User Story:** As an analyst, I want to export the Neo-Brutalist player report as a PDF, so that I can share it with coaches and staff.

#### Acceptance Criteria

1. WHEN the PDF download BrutalistButton is clicked, THE Dashboard SHALL capture the PlayerReport DOM node using `html2canvas` and generate a PDF via `jsPDF`, preserving the Neo-Brutalist styling.
2. THE Dashboard SHALL set `html2canvas` `scale` to 2 for single-player exports to ensure high-resolution output.
3. WHEN canvas elements are present in the PlayerReport, THE Dashboard SHALL pass `useCORS: true` and `allowTaint: true` to `html2canvas` to ensure Canvas_Pitch content is captured.
4. IF the PDF generation fails, THEN THE Dashboard SHALL display an error message in red (#D90429) in the top bar for 4 seconds before clearing it.
