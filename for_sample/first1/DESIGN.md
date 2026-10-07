---
name: System Cyberpunk Terminal
colors:
  surface: '#111318'
  surface-dim: '#111318'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e13'
  surface-container-low: '#191c20'
  surface-container: '#1d2024'
  surface-container-high: '#272a2f'
  surface-container-highest: '#32353a'
  on-surface: '#e1e2e9'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#e1e2e9'
  inverse-on-surface: '#2e3035'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e79400'
  on-tertiary-container: '#563400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#111318'
  on-background: '#e1e2e9'
  surface-variant: '#32353a'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: 0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-lg:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.12em
  label-sm:
    fontFamily: Space Mono
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.16em
  code-stream:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 15px
    letterSpacing: -0.01em
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system models an ultra-classified, militarized cyber-intelligence console experiencing an active, hostile electronic warfare breach. The UI operates under a dual psychological paradigm: the cold, disciplined precision of an orbital defense mainframe contrasted against the chaotic, predatory signal disruption of the "Mazdak" intrusion protocol.

The design movement synthesizes **Tactical Cyber-Brutalism** with **Dark Glassmorphic HUD telemetry**. Interfaces are dense, hyper-structured, and unapologetically engineered for mission-critical command. The aesthetic balances crisp terminal grids with diegetic hardware artifacts: CRT phosphor grain, horizontal micro-scanlines, low-persistence raster persistence, chromatic aberration spikes, and vector audio-waveform monitors. The tone is severe, urgent, and covert.

## Colors

The palette is rooted in cold, deep tactical space voids with razor-sharp emissive accents for situational states:

- **Base Void (`#05070B`)**: The foundational canvas backing, representing zero-lux sensor fields.
- **Sub-panel Tier (`#0B111B`)**: Opaque structural backing for containment nodes, tactical tables, and signal decoders.
- **Tactical Cyber Cyan (`#06B6D4`)**: Primary vector layer for active telemetry, data routes, signal frequencies, and targeting brackets.
- **System Verified Emerald (`#10B981`)**: Nominal operations, encrypted channel confirmations, and handshake clearances.
- **Classified Warning Gold (`#F59E0B`)**: Threat stage alerts, buffer overflows, and declassification timers.
- **Mazdak Threat Vectors**:
  - **Incursion Crimson (`#EF4444`)**: Hostile override flags, kernel panics, and breach indicators.
  - **Acid Kinetic Green (`#22C55E`)**: Signal exploitation scripts, matrix rain injection, and raw memory leaks.
- **Monochrome Accents**: `#1E293B` for unselected HUD wireframes; `#94A3B8` for secondary telemetry labels; `#F8FAFC` for high-priority terminal alerts.

## Typography

Typography establishes mechanical certainty. All data representations, system logs, memory addresses, and military telemetry utilize fixed-pitch monospaced fonts (`JetBrains Mono`, `Space Mono`) to guarantee column parity and alignment across dense hex feeds. Display headers use `Space Grotesk` for geometric authority.

All labels and status micro-copy are rendered in uppercase with wide tracking (`0.08em` to `0.16em`) to echo physical military instrument panels. Bi-directional and RTL typographic rendering must support mixed hex strings, right-to-left command prompts, and coordinates without breaking monospaced column layouts.

## Layout & Spacing

The terminal layout functions on a rigid 12-column tactical telemetry grid that converts into modular quadrant views. 

- **Desktop (1440px+)**: Multi-viewport HUD. Quadrants host simultaneous streams: live spectrum analyzer (left), central orbital tracking/glitch matrix (center), and live hex dump/incident log (right). Outer margins lock at `2rem`, gutters at `1.5rem`.
- **Tablet (768px - 1439px)**: Dual-pane split console with collapsible telemetry drawers. Gutters scale down to `1rem`.
- **Mobile (<768px)**: Stacked single-feed terminal with bottom-docked command input and horizontal tab switching between nodes. Canvas margins compress to `1rem`.

Component padding uses the dense `space-xs` (4px) to `space-md` (16px) range to maintain high information density per square inch.

## Elevation & Depth

Visual depth is achieved through translucent optical instrumentation, laser-etched strokes, and glow fields rather than traditional shadow drop-offs:

1. **Base Layer (Level 0)**: Unlit `#05070B` void covered by an SVG scanline filter (1px alternating lines at 12% opacity) and a vignette gradient.
2. **Structural Panels (Level 1)**: Semi-transparent `#0B111B` at 85% opacity with a `12px` backdrop blur, framed by a 1px border of `#06B6D4` at 20% opacity.
3. **Targeting Overlays & HUD Nodes (Level 2)**: Semi-transparent `#0B111B` at 95% opacity with a 1px high-contrast border (`#06B6D4` or `#EF4444`) accompanied by an outer neon glow: `0 0 12px rgba(6, 182, 212, 0.25)`.
4. **Active Mazdak Breach Incursion (Level 3)**: Unstable z-index elements featuring alternating CSS chromatic shift keyframes (`1px` offset in `#EF4444` and `#22C55E`), overlaid with animated rain glyph channels.

## Shapes

The interface embraces complete geometric angularity (`roundedness: 0`). Curved edges are prohibited to uphold an austere military radar aesthetic.

Instead of border-radius, panels utilize diagonal 45-degree chamfered cut corners (`clip-path: polygon()`) measuring 8px to 12px on opposing edges (top-right and bottom-left). Tactical reticles, crosshairs, and corner brackets (`L`-shaped registration marks) encase modular cards to reinforce physical hardware terminal frames.

## Components

### Action Controls & Buttons
- **Tactical Buttons**: Square, zero-radius blocks with 1px border. Primary variant uses an inverted state: `#06B6D4` solid background with `#05070B` text. Secondary variant uses a transparent core with a 1px `#06B6D4` border, shifting to 20% cyan fill on hover.
- **Hostile Intercept / Override Button**: Chamfered edges, `#EF4444` border, flashing warning glyph prefix, and an ambient red pulse.

### Status Indicators & Chips
- **Telemetry Chips**: Monospaced labels housed inside a micro-capsule bordered by 1px muted cyan or verified green. Prefixed with a live blinking status dot (1 Hz animation).
- **Hazard Badges**: High-contrast gold `#F59E0B` or crimson `#EF4444` inverted containers for security clearances and breach alerts.

### Input & Command Prompts
- **Terminal CLI Input**: Borderless bottom-anchored input line marked by an active cyan prompt glyph (`>`). Features a solid block blinking caret and a real-time hex syntax checker. Focus states trigger an underglow stroke.

### Selection Controls
- **Checkboxes & Radios**: Angular square frames (`14x14px`) with a 1px border. Checked state renders a solid inner diamond or crosshair reticle in `#06B6D4` (system) or `#22C55E` (Mazdak mode).

### Panels & Data Cards
- **HUD Telemetry Cards**: Outer 1px frame with accented corner brackets. Header bars feature a horizontal scanline pattern and military coordinate labels (`LAT/LONG/SEC`).
- **Waveform & Audio Spectrum Monitors**: Segmented vertical SVG bar visualizers displaying fluctuating decibel vectors in cyber cyan and verified emerald.
- **Glitch & Matrix Rain Canvas**: Inline canvas modules rendering falling glyphs (`#22C55E`), interrupted by horizontal displacement tearing during breach spikes.