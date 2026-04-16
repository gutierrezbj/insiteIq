# InsiteIQ — DESIGN.md

**Status:** Foundation stub. Track B (Identity Sprint by space) fills the blanks.

This document is the handoff contract between design and development. It lives in the repo so that any builder (human or IA) can implement without guessing visual decisions. It is the source of truth for tokens, motion, signature details, and per-space personality.

---

## Base Design System — SRS Nucleus v2.0

Preserved from v0. Applies as the shared floor across the 3 spaces. Each space then layers its own personality on top (see below, Track B pending).

### Character (base)
"War room meets luxury ops center."

### Palette (base)
- **Surface base:** `#0C0A09` (stone-950 warm black)
- **Surface raised:** `#1C1917` (stone-900)
- **Surface overlay:** `#292524` (stone-800)
- **Surface border:** `#44403C` (stone-700)
- **Primary:** `#D97706` (amber-600) — mission-control warmth
- **Primary light:** `#F59E0B` (amber-500)
- **Primary dark:** `#B45309` (amber-700)
- **Semantic:** success `#22C55E` · warning `#EAB308` · danger `#EF4444` · info `#06B6D4`
- **Text:** primary `#FAFAF9` · secondary `#A8A29E` · tertiary `#78716C`

### Typography (base)
- **Display:** Instrument Sans (400–700)
- **Body:** DM Sans (300–700)
- **Mono:** JetBrains Mono (400–600) — data, labels, code
- **Caption:** `text-2xs` (0.625rem) + `tracking-widest-srs` (0.12em) + uppercase

### Motion (base)
- **Primary easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **Durations:** instant 100ms · fast 180ms · normal 280ms · slow 400ms · slower 600ms
- **Stagger:** 60ms delay per item in lists (`animation: stagger-in 0.4s ease-out-expo`)
- **Active feedback:** `scale(0.97)` on press for all interactive elements

### Signature details (base)
- **accent-bar:** 3px amber left border on hero panels and cards
- **label-caps:** uppercase JetBrains Mono, `tracking-widest-srs`, color stone-500
- **warm scrollbar:** stone-900 track, stone-700 thumb
- **glow shadows:** `0 0 20px rgba(217, 119, 6, 0.25)` for primary CTAs

### Blacklist (do not use)
- Fonts: Inter, Poppins, Roboto, any Google default
- Colors: Tailwind default `blue`, `indigo`, `gray` (use stone scale)
- Layouts: generic "admin template" card grids, centered single-column SaaS marketing
- Motion: `linear` easing, `ease-in` on enter animations
- Backgrounds: pure `#FFFFFF`, pure `#000000`, `#111827` (Tailwind's gray-900)

---

## Per-space personality — Track B pending

The 3 spaces share the base system but diverge in density, mood and primary surface so they feel like the *same product* with *distinct personalities*.

### SRS Coordinators (desktop, war-room)
- **Tone:** dark, dense, fast. Operators running multiple concurrent workflows.
- **Character phrase (candidate):** *"War room de portaaviones con acabados de relojeria suiza"*
- **Surface:** stone-950 base, raised stone-900 panels, stone-700 dividers.
- **Density:** high — tables, sidebars, multi-panel cockpit.
- **Signature:** accent-bar visible everywhere; glow on active alerts; stagger on every list.

### Client Coordinator (desktop, professional)
- **Tone:** clean, confident, zero internal noise.
- **Character phrase (candidate):** *"Recepcion de hotel 5 estrellas donde todo funciona sin que veas el esfuerzo"*
- **Surface:** light-first OR warm neutral dark — to be decided in Track B.
- **Density:** low — one clear primary per screen. Generous whitespace.
- **Signature:** subtler accent-bar; narrower type scale; less motion.

### Tech Field PWA (mobile, field-tool)
- **Tone:** high-contrast, tactile, essential-only.
- **Character phrase (candidate):** *"Herramienta de cirujano de campo: todo a la mano, nada sobra"*
- **Surface:** stone-950 dark with amber for CTAs and confirmations.
- **Density:** minimal — one action per view. Bottom-nav always reachable with thumb.
- **Touch targets:** 44×44px minimum per WCAG.
- **Signature:** amber bottom accent on active tab; haptic feedback (if available) on state changes.

> Track B deliverables will replace these placeholders with the 6 Identity Sprint decisions per space + moodboard + wireframes of critical flows + hi-fi mocks with states.

---

## Tokens (canonical)

All tokens live in `frontend/tailwind.config.js`. Anything else in the codebase that sets a color, spacing, radius, duration or easing inline is a **design bug**.

Structural tokens (never per-space):
- spacing scale (0 → 12)
- radius (none, sm, md, lg, xl, 2xl, full)
- duration (instant → slower)
- easing (out-expo, out-back, in-out-circ, spring)
- z-index (base → tooltip)
- breakpoints (sm 640 / md 1024 / lg 1440)

Skinnable tokens (Track B will split per space):
- color surfaces
- color primary + semantic
- font sizes + weights
- shadow scale

---

## Handoff rules
- No hex literal in component code — always `tailwind.config.js` or a CSS variable.
- No inline `style={{}}` for spacing/color — use utility classes.
- No motion without easing and duration tokens from the system.
- Every screen has the 5 states implemented: default · empty · loading (skeleton) · error · success.
- Distinctiveness Audit (12 points, see Notion UX/UI checklist) must pass before any prod deploy.

---

## Pending (Track B — Identity Sprint by space)
- [ ] Moodboard with 10-15 non-digital references per space
- [ ] 6 Identity Sprint decisions × 3 spaces (18 total)
- [ ] Theme files: `theme-insiteiq-srs.js`, `theme-insiteiq-client.js`, `theme-insiteiq-tech.js`
- [ ] Wireframes of critical flows per space (~12-15 wireframes)
- [ ] Hi-fi mocks of critical flows with 5 states each
- [ ] Prototipo interactivo por espacio
- [ ] Distinctiveness Audit firmado
- [ ] Update this file with final decisions post-sprint

---

## References
- Notion: SRS Design System v2.0
- Notion: [PLANTILLA] Checklist UX/UI v1.0
- Notion: Checklist UX/UI — InsiteIQ v1 (pre-populated)
- Repo memory: Blueprint v1.1 + pain evidence log
